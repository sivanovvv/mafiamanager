<?php
/**
 * @brief		Overview statistics extension: ContentActivity
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/
 * @package		Invision Community
 * @since		16 Jan 2020
 */

namespace IPS\core\extensions\core\OverviewStatistics;

/* To prevent PHP errors (extending class does not exist) revealing path */

use DomainException;
use IPS\Content;
use IPS\Content\Comment;
use IPS\Content\Item;
use IPS\Content\Review;
use IPS\DateTime;
use IPS\Db;
use IPS\Extensions\OverviewStatisticsAbstract;
use IPS\Helpers\Form;
use IPS\Helpers\Form\Node;
use IPS\Request;
use IPS\Theme;
use function defined;
use function explode;
use function in_array;
use function is_array;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * @brief	Overview statistics extension: ContentActivity
 */
class ContentActivity extends OverviewStatisticsAbstract
{
	/**
	 * @brief	Which statistics page (activity or user)
	 */
	public string $page	= 'activity';

	/**
	 * @brief	Content item classes returned by ContentRouter
	 */
	protected array $classes	= array();

	/**
	 * Constructor: load content router classes
	 *
	 * @return void
	 */
	public function __construct()
	{
		/* Note that we only load content item classes - we will show comment/review counts within the block itself ourselves */
		foreach( Content::routedClasses( FALSE, TRUE, TRUE ) as $class )
		{
			$this->classes[] = $class;
		}

		$this->classes[] = 'IPS\\core\\Messenger\\Conversation';
	}

	/**
	 * Return the sub-block keys
	 *
	 * @note This is designed to allow one class to support multiple blocks, for instance using the ContentRouter to generate blocks.
	 * @return array
	 */
	public function getBlocks(): array
	{
		return $this->classes;
	}

	/**
	 * Return block details (title and description)
	 *
	 * @param	string|NULL	$subBlock	The subblock we are loading as returned by getBlocks()
	 * @return	array
	 */
	public function getBlockDetails( string $subBlock = NULL ): array
	{
		/* $subBlock will be set to the class we want to work with */
		/* @var Item $subBlock */
		return array( 'app' => $subBlock::$application, 'title' => $subBlock::$title . '_pl', 'description' => null, 'refresh' => 10, 'form' => isset( $subBlock::$containerNodeClass ) );
	}

	/** 
	 * Return the block HTML to show
	 *
	 * @param	array|string|null    $dateRange	String for a fixed time period in days, NULL for all time, or an array with 'start' and 'end' \IPS\DateTime objects to restrict to
	 * @param	string|NULL	$subBlock	The subblock we are loading as returned by getBlocks()
	 * @return	string
	 */
	public function getBlock( array|string $dateRange = NULL, string $subBlock = NULL ): string
	{
		/* Make sure someone isn't trying to manipulate the request or do something weird */
		if( !in_array( $subBlock, $this->classes ) )
		{
			return '';
		}

		$data = $this->getBlockNumbers( $dateRange, $subBlock );
		$values = $data['statsreports_current_count'];
		$previousValues = $data['statsreports_previous_count'];

		return Theme::i()->getTemplate( 'activitystats' )->overviewCounts( $values, $previousValues, $this->nodeNames );
	}

	protected array $nodeNames = [];

	/**
	 * Get the block numbers
	 *
	 * @param array|string|null $dateRange String for a fixed time period in days, NULL for all time, or an array with 'start' and 'end' \IPS\DateTime objects to restrict to
	 * @param string|NULL $subBlock The subblock we are loading as returned by getBlocks()
	 *
	 * @return array{statsreports_current_count: number[], statsreports_previous_count: number[]}
	 */
	public function getBlockNumbers( array|string $dateRange = NULL, string $subBlock=NULL ) : array
	{
		$classesToCheck	= array( $subBlock );
		$values			= array();
		$previousValues	= array();
		$this->nodeNames		= [];

		/* @var Item $subBlock */
		if ( isset( $subBlock::$commentClass ) )
		{
			/* @var Comment $commentClass */
			$commentClass = $subBlock::$commentClass;
			if ( $commentClass::incrementPostCount() )
			{
				$classesToCheck[] = $commentClass;
			}
		}
		if ( isset( $subBlock::$reviewClass ) )
		{
			/* @var Review $reviewClass */
			$reviewClass = $subBlock::$reviewClass;
			if ( $reviewClass::incrementPostCount() )
			{
				$classesToCheck[] = $subBlock::$reviewClass;
			}
		}

		/* Loop over our classes to fetch the data */
		foreach( $classesToCheck as $class )
		{
			/* Build where clause in the event we are filtering */
			$where = [];

			if( $dateRange !== NULL AND isset( $class::$databaseColumnMap['date'] ) )
			{
				$dateColumn = is_array( $class::$databaseColumnMap['date'] ) ? $class::$databaseColumnMap['date'][0] : $class::$databaseColumnMap['date'];

				if( is_array( $dateRange ) )
				{
					$where = array(
						array( $class::$databasePrefix . $dateColumn . ' > ?', $dateRange['start']->getTimestamp() ),
						array( $class::$databasePrefix . $dateColumn . ' < ?', $dateRange['end']->getTimestamp() ),
					);
				}
				else
				{
					$currentDate	= new DateTime;
					$interval = static::getInterval( $dateRange );
					$initialTimestamp = $currentDate->sub( $interval )->getTimestamp();
					$where = array( array( $class::$databasePrefix . $dateColumn . ' > ?', $initialTimestamp ) );

					$previousValues[ $class::$title . '_pl' ] = Db::i()->select( 'COUNT(*)', $class::$databaseTable, $this->_modifyWhereClause( array( array( $class::$databasePrefix . $dateColumn . ' BETWEEN ? AND ?', $currentDate->sub( $interval )->getTimestamp(), $initialTimestamp ) ), $class ) )->first();
				}
			}

			if( isset( $class::$containerNodeClass ) AND $containerClass = $class::$containerNodeClass and $containerClassTitle = $containerClass::$nodeTitle and Request::i()->$containerClassTitle )
			{
				foreach( explode( ',', Request::i()->$containerClassTitle ) as $nodeId )
				{
					$this->nodeNames[] = $containerClass::load( $nodeId )->_title;
				}
			}

			$values[ $class::$title . '_pl' ] = Db::i()->select( 'COUNT(*)', $class::$databaseTable, $this->_modifyWhereClause( $where, $class ) )->first();
		}

		return [
			"statsreports_previous_count" => $previousValues,
			"statsreports_current_count" => $values,
		];
	}

	/**
	 * Modify the where clause to apply other filters
	 * 
	 * @param	array			$where	Current where clause
	 * @param	string			$class	Class we are working with
	 * @return	array
	 */
	protected function _modifyWhereClause( array $where, string $class ) : array
	{
		/* Don't include soft deleted content */
		$column = NULL;
		if ( isset( $class::$databaseColumnMap['hidden'] ) )
		{
			$column = $class::$databasePrefix . $class::$databaseColumnMap['hidden'];
		}
		elseif ( isset( $class::$databaseColumnMap['approved'] ) )
		{
			$column = $class::$databasePrefix . $class::$databaseColumnMap['approved'];
		}
		
		if ( $column )
		{
			$where[] = array( Db::i()->in( $column, array( -2, -3 ), TRUE ) );
		}
		
		if ( method_exists( $class, 'overviewStatisticsWhere' ) )
		{
			$where = array_merge( $where, $class::overviewStatisticsWhere() );
		}
		
		if( isset( $class::$containerNodeClass ) AND $containerClass = $class::$containerNodeClass and $containerClassTitle = $containerClass::$nodeTitle and Request::i()->$containerClassTitle )
		{
			/* @var array $databaseColumnMap */
			$where[] = array( Db::i()->in( $class::$databasePrefix . $class::$databaseColumnMap['container'], explode( ',', Request::i()->$containerClassTitle ) ) );
		}

		return $where;
	}

	/**
	 * Return block filter form, or the updated block result upon submit
	 *
	 * @param   Form            &$form
	 * @param	string|NULL	    $subBlock	The subblock we are loading as returned by getBlocks()
	 * @param   array           $values
	 *
	 * @return	void
	 * @throws DomainException
	 */
	protected function _blockForm( Form &$form, ?string $subBlock = null, array $values=[] ) : void
	{
		/* Make sure someone isn't trying to manipulate the request or do something weird */
		if( !in_array( $subBlock, $this->classes ) )
		{
			throw new DomainException;
		}

		if( !isset( $subBlock::$containerNodeClass ) )
		{
			throw new DomainException;
		}

		$containerClass = $subBlock::$containerNodeClass;
		$default = @$values[$containerClass::$nodeTitle] ? explode( ',', $values[$containerClass::$nodeTitle] ) : NULL;
		$form->add( new Node( $containerClass::$nodeTitle, $default, false, array( 'class' => $containerClass, 'multiple' => TRUE, 'clubs' => TRUE ) ) );
	}
}