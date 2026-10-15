<?php

namespace IPS\mafiamanager\extensions\core\UINode;

use IPS\Db;
use IPS\Helpers\Form\YesNo;
use IPS\Node\Model;
use IPS\Output\UI\Node as UINode;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
    header(
        ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' )
        . ' 403 Forbidden'
    );
    exit;
}

class MafiaForum extends UINode
{
    public static ?string $class = 'IPS\forums\Forum';

    /**
     * Stores the submitted checkbox value during this request.
     * null means the field was not submitted.
     */
    private static ?bool $pendingEnabled = null;

    /**
     * Add the checkbox to the forum configuration.
     */
    public function formElements( Model $node ): array
    {
        $enabled = false;
        $forumId = (int) $node->_id;

        if ( $forumId > 0 )
        {
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
                // No configuration yet; default to disabled.
            }
        }

        return [
            'mafiamanager_allow_voting' => new YesNo(
                'mafiamanager_allow_voting',
                $enabled,
                false
            )
        ];
    }

    /**
     * Capture the validated value, then remove our custom
     * field so Invision does not save it in its forum table.
     */
    public function processForm(
        Model $node,
        array $values
    ): array
    {
        self::$pendingEnabled = null;

        if ( array_key_exists(
            'mafiamanager_allow_voting',
            $values
        ) )
        {
            self::$pendingEnabled = (bool)
                $values['mafiamanager_allow_voting'];

            unset( $values['mafiamanager_allow_voting'] );
        }

        return $values;
    }

    /**
     * Save the checkbox to Mafia Manager's own database.
     */
    public function formPostSave(
        Model $node,
        array $values
    ): void
    {
        if ( self::$pendingEnabled === null )
        {
            return;
        }

        $forumId = (int) $node->_id;

        if ( $forumId < 1 )
        {
            return;
        }

        Db::i()->replace(
            'mafiamanager_forums',
            [
                'forum_id' => $forumId,
                'enabled' => self::$pendingEnabled ? 1 : 0
            ]
        );

        self::$pendingEnabled = null;
    }
}
