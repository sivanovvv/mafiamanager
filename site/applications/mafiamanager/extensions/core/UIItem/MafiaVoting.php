<?php

namespace IPS\mafiamanager\extensions\core\UIItem;

use IPS\Content\Item as BaseItem;
use IPS\Db;
use IPS\forums\Forum;
use IPS\Helpers\Form\YesNo;
use IPS\Node\Model;
use IPS\Output\UI\Item as UIItem;
use IPS\DateTime;
use IPS\Helpers\Form\Date;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
    header(
        ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' )
        . ' 403 Forbidden'
    );
    exit;
}

class MafiaVoting extends UIItem
{
    public static ?string $class = 'IPS\forums\Topic';

    /**
     * Add Mafia voting to new-topic forms in allowed forums.
     */
    public function formElements(
        ?BaseItem $item,
        ?Model $container
    ): array
    {
			
        // For now, only display when creating a new topic.
        if ( $item !== null )
        {
            return [];
        }

        // Only forum topics are supported.
        if ( !( $container instanceof Forum ) )
        {
            return [];
        }

        $forumId = (int) $container->_id;

        if ( $forumId < 1 )
        {
            return [];
        }

        // Check the forum administrator's configuration.
        try
        {
            $enabled = (bool) Db::i()->select(
                'enabled',
                'mafiamanager_forums',
                [ 'forum_id=?', $forumId ]
            )->first();
        }
        catch ( \UnderflowException $e )
        {
            return [];
        }

        if ( !$enabled )
        {
            return [];
        }

			return [
					'mafiamanager_enable_voting' => new YesNo(
							'mafiamanager_enable_voting',
							false,
							false,
							[
									'togglesOn' => [
											'mafiamanager_voting_deadline'
									]
							]
					),

					'mafiamanager_voting_deadline' => new Date(
							'mafiamanager_voting_deadline',
							null,
							true,
							[
									'time' => true,
									'min' => DateTime::ts(time() + 60)
							]
					)
			];
    }

		public function formPostSave(
    BaseItem $item,
    array $values
): void
{
    error_log(
        '[Mafia] Topic ID: ' . $item->tid .
        ', Voting enabled: ' .
        var_export(
            $values['mafiamanager_enable_voting'] ?? null,
            true
        )
    );
}
}
