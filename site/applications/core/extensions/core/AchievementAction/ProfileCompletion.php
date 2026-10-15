<?php
/**
 * @brief		Achievement Action Extension
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @license		https://www.invisioncommunity.com/legal/standards/

 * @since		10 Feb 2026
 */

namespace IPS\core\extensions\core\AchievementAction;

/* To prevent PHP errors (extending class does not exist) revealing path */

use IPS\core\Achievements\Actions\AchievementActionAbstract;
use IPS\core\Achievements\Rule;
use IPS\Db;
use IPS\Member as MemberClass;
use function defined;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Achievement Action Extension
 */
class ProfileCompletion extends AchievementActionAbstract // NOTE: Other classes exist to provided bases for common situations, like where node-based filters will be required
{	
	/**
	 * Work out if the filters applies for a given action
	 *
	 * Important note for milestones: consider the context. This method is called by \IPS\Member::achievementAction(). If your code
	 * calls that BEFORE making its change in the database (or there is read/write separation), you will need to add
	 * 1 to the value being considered for milestones
	 *
	 * @param	MemberClass	$subject	The subject member
	 * @param	array		$filters	The value returned by formatFilterValues()
	 * @param	mixed		$extra		Any additional information about what is happening (e.g. if a post is being made: the post object)
	 * @return	bool
	 */
	public function filtersMatch( MemberClass $subject, array $filters, mixed $extra = NULL ): bool
	{
		return $subject->members_bitoptions['profile_completed'];
	}
	
	/**
	 * Get identifier to prevent the member being awarded points for the same action twice
	 * Must be unique within within of this domain, must not exceed 32 chars.
	 *
	 * @param	MemberClass	$subject	The subject member
	 * @param	mixed		$extra		Any additional information about what is happening (e.g. if a post is being made: the post object)
	 * @return	string
	 */
	public function identifier( MemberClass $subject, mixed $extra = NULL ): string
	{
		return (string) $subject->member_id;
	}
	
	/**
	 * Return a description for this action to show in the log
	 *
	 * @param	string	$identifier	The identifier as returned by identifier()
	 * @param	array	$actor		If the member was the "subject", "other", or both
	 * @return	string
	 */
	public function logRow( string $identifier, array $actor ): string
	{
		return MemberClass::loggedIn()->language()->addToStack( 'AchievementAction__ProfileCompletion_log' );
	}
	
	/**
	 * Get "description" for rule
	 *
	 * @param	Rule	$rule	The rule
	 * @return	string|NULL
	 */
	public function ruleDescription( Rule $rule ): ?string
	{
		return MemberClass::loggedIn()->language()->addToStack( 'AchievementAction__ProfileCompletion_title' );
	}

	/**
	 * Get rebuild data
	 *
	 * @return	array
	 */
	static public function rebuildData(): array
	{
		// This method returns an array of tables that this extension uses to award achievements, so for example
		// the follow extension uses 'core_follow'.
		// We also need to know the primary key for this table. It should be unique but does not need to be an integer
		// The date is optional but useful if available for those that want to partially rebuild.
		// Where shouldn't attempt to limit based on filters or milestones, but just remove data that you don't need to 
		// look at, such as banned members, archived items and so on. You can return an empty array if you do not need
		// a where statement.
		return [ [
			'table' => 'core_members',
			'pkey' => 'member_id',
			'where' => [
				[ Db::i()->bitwiseWhere( MemberClass::$bitOptions['members_bitoptions'], 'profile_completed' ) ]
			]
		] ];
	}

	/**
	 * Process the rebuild row
	 *
	 * @param array		$row	Row from database
	 * @param array		$data	Data collected when starting rebuild [table, pkey...]
	 * @return void
	 */
	public static function rebuildRow( array $row, array $data ) : void
	{
		MemberClass::constructFromData( $row )->achievementAction( 'core', 'ProfileCompletion' );
	}
}