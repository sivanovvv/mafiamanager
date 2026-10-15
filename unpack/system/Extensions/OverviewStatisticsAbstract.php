<?php

/**
 * @brief        OverviewStatisticsAbstract
 * @author        <a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright    (c) Invision Power Services, Inc.
 * @license        https://www.invisioncommunity.com/legal/standards/
 * @package        Invision Community
 * @subpackage
 * @since        11/20/2023
 */

namespace IPS\Extensions;

/* To prevent PHP errors (extending class does not exist) revealing path */

use DateInterval;
use DateTimeZone;
use DomainException;
use Exception;
use IPS\DateTime;
use IPS\Db;
use IPS\Helpers\Form;
use IPS\Helpers\Form\Date;
use IPS\Member;
use IPS\Request;
use IPS\Theme;
use UnderflowException;
use function is_array;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

abstract class OverviewStatisticsAbstract
{
	/**
	 * @brief	Which statistics page (activity or user)
	 */
	public string $page	= 'user';

	/**
	 * Return the sub-block keys
	 *
	 * @note This is designed to allow one class to support multiple blocks, for instance using the ContentRouter to generate blocks.
	 * @return array
	 */
	abstract public function getBlocks(): array;

	/**
	 * Return block details (title and description)
	 *
	 * @param	string|NULL	$subBlock	The subblock we are loading as returned by getBlocks()
	 * @return	array
	 */
	abstract public function getBlockDetails( ?string $subBlock = NULL ): array;

	/**
	 * Return the block HTML to show
	 *
	 * @param	array|string|null    $dateRange	String for a fixed time period in days, NULL for all time, or an array with 'start' and 'end' \IPS\DateTime objects to restrict to
	 * @param	string|NULL	$subBlock	The subblock we are loading as returned by getBlocks()
	 * @return	string
	 */
	abstract public function getBlock( array|string|null $dateRange = NULL, ?string $subBlock = NULL ): string;

	/**
	 * Calculate interval for charts
	 *
	 * @param int|null $dateRange
	 * @return DateInterval|null
	 */
	protected static function getInterval( ?int $dateRange ) : ?DateInterval
	{
		switch( $dateRange )
		{
			case '7':
				return new DateInterval( 'P7D' );

			case '30':
				return new DateInterval( 'P1M' );

			case '90':
				return new DateInterval( 'P3M' );

			case '180':
				return new DateInterval( 'P6M' );

			case '365':
				return new DateInterval( 'P1Y' );
		}

		return null;
	}

	/**
	 * Note: this method must be overridden in extension instances. Returning an empty array will exclude this block from the CSV download.
	 *
	 * @param null|array|string     $dateRange=null
	 * @param null|string           $subBlock=null
	 *
	 * @return array|null
	 */
	public function getBlockNumbers( array|string $dateRange = null, string $subBlock = null ) : array|null
	{
		return null;
	}

	/**
	 * @param Form          $form
	 * @param string|null   $subBlock
	 * @param array         $values         The values saved to this form. Note that all that is saved is the raw request parameter, not the final formatted value from $form->values().
	 * @return void
	 * @throws DomainException
	 */
	protected function _blockForm( Form &$form, ?string $subBlock = null, array $values=[] ) : void
	{}

	/**
	 * @var array|null
	 */
	protected array|null $_savedBlockFilters = null;

	/**
	 * @return array
	 */
	public function getSavedBlockFilters() : array
	{
		if ( is_null( $this->_savedBlockFilters ) )
		{
			$this->_savedBlockFilters = [];
			if ( Request::i()->saved_block_id )
			{
				$where = [
					[ 'id=?', Request::i()->saved_block_id ],
					[ "(stat_member=? or stat_member is null)", Member::loggedIn()->member_id ]
				];

				if ( Request::i()->save_block_filters and $filters = json_decode( Request::i()->updated_filters ?: '', true ) and is_array( $filters ) )
				{
					$this->_savedBlockFilters = $filters;
					Db::i()->update( 'core_saved_overview_stats', ['stat_filters' => json_encode( $filters )], $where );
				}
				else
				{
					try
					{
						$filters = json_decode( Db::i()->select( 'stat_filters', 'core_saved_overview_stats', $where )->first() ?: '{}', true );
						if ( is_array( $filters ) )
						{
							$this->_savedBlockFilters = $filters;
							foreach ( $this->_savedBlockFilters as $k => $v )
							{
								if ( isset( Request::i()->$k ) )
								{
									$this->_savedBlockFilters[ $k ] = Request::i()->$k;
								}
							}
						}
					}
					catch ( UnderflowException ) {}
				}
			}
		}

		return $this->_savedBlockFilters;
	}

	/**
	 * Return block filter form, or the updated block result upon submit
	 *
	 * @param	string|NULL	$subBlock	The subblock we are loading as returned by getBlocks()
	 * @return	string|null
	 */
	public function getBlockForm( string $subBlock = NULL ): string|null
	{
		if ( ( $details = $this->getBlockDetails( $subBlock ) ) and @$details['form'] )
		{
			$form = new Form( 'statsreports_update_block_filters', submitLang: 'statsreports_update_block_filters' );
			$formFields = $this->getSavedBlockFilters();

			try
			{
				$this->_blockForm( $form, $subBlock, $formFields );
			}
			catch ( DomainException )
			{
				return null;
			}
			/* Note: there is an intentional possible uncaught ex. to adhere to fail fast; it's an implementation issue in that case */

			$form->class = "ipsForm--vertical";
			$form->attributes['data-block'] = Request::i()->blockKey;
			$form->attributes['data-subblock'] = $subBlock;

			/* Add submit button to save default values */
			if ( Request::i()->saved_block_id )
			{
				$form->actionButtons[] = Theme::i()->getTemplate( 'forms', 'core', 'global' )->button(
					'statsreports_save_block_filters',
					'submit',
					null,
					'ipsButton ipsButton--primary',
					array(
						'tabindex' => '2',
						'accesskey' => 'd',
						'data-ipstooltip' => '',
						'title' => Member::loggedIn()->language()->addToStack( 'statsreports_save_block_filters_desc' ),
						'name' => 'save_block_filters',
						'value' => '1',
					)
				);
			}

			if( $values = $form->values() )
			{
				if ( Request::i()->saved_block_id and Request::i()->save_block_filters )
				{
					$toSerialize = [];
					foreach ( $values as $k => $v )
					{
						$toSerialize[ $k ] = Request::i()->$k;
					}

					$serialized = json_encode( $toSerialize );
					Db::i()->update( 'core_saved_overview_stats', [ 'stat_filters' => $serialized ], [
						[ 'id=?', Request::i()->saved_block_id ],
						[ "(stat_member=? or stat_member is null)", Member::loggedIn()->member_id ]
					] );
					$this->_savedBlockFilters = $toSerialize;
				}
				$dateFilters = NULL;

				if( Request::i()->range )
				{
					$dateFilters = Request::i()->range;
				}
				elseif( Request::i()->start )
				{
					try
					{
						$timezone = Member::loggedIn()->timezone ? new DateTimeZone( Member::loggedIn()->timezone ) : NULL;
					}
					catch ( Exception $e )
					{
						$timezone = NULL;
					}

					$dateFilters = array(
						'start'	=> new DateTime( Date::_convertDateFormat( Request::i()->start ), $timezone ),
						'end'	=> new DateTime( Date::_convertDateFormat( Request::i()->end ), $timezone )
					);
				}

				return $this->getBlock( $dateFilters, $subBlock );
			}

			return (string) $form;
		}
		return null;
	}
}