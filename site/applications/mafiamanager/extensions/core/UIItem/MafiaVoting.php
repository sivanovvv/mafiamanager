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
use IPS\Helpers\Form\Member as MemberField;

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
                'mafiamanager_voting_deadline',
                'mm_players_normal',
                'mm_players_double',
                'mm_players_zero'
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
    ),

    'mm_players_normal' => new MemberField(
        'mm_players_normal',
        null,
        false,
        ['multiple' => null]
    ),

    'mm_players_double' => new MemberField(
        'mm_players_double',
        null,
        false,
        ['multiple' => null]
    ),

    'mm_players_zero' => new MemberField(
        'mm_players_zero',
        null,
        false,
        ['multiple' => null]
    )
];
    }

		public function formPostSave(
    BaseItem $item,
    array $values
): void
{
    if (empty($values['mafiamanager_enable_voting'])) {
        return;
    }

    $deadline = $values['mafiamanager_voting_deadline'] ?? null;

    if (
        !$deadline instanceof \DateTimeInterface ||
        $deadline->getTimestamp() <= time()
    ) {
        error_log('[Mafia] Invalid voting deadline');
        return;
    }

    $topicId = (int) $item->tid;
    $forumId = (int) $item->forum_id;
    $managerId = (int) $item->author()->member_id;

    if (!$topicId || !$forumId || !$managerId) {
        return;
    }

    // Enforce the administrator's forum permission.
    try {
        $allowed = (bool) Db::i()->select(
            'enabled',
            'mafiamanager_forums',
            ['forum_id=?', $forumId]
        )->first();
    } catch (\UnderflowException $e) {
        return;
    }

    if (!$allowed) {
        return;
    }

    // Prevent duplicate games for the same topic.
    try {
        Db::i()->select(
            'id',
            'mafiamanager_games',
            ['topic_id=?', $topicId]
        )->first();

        return;
    } catch (\UnderflowException $e) {
        // No game exists yet.
    }

    Db::i()->insert('mafiamanager_games', [
        'topic_id' => $topicId,
        'forum_id' => $forumId,
        'manager_id' => $managerId,
        'voting_deadline' => $deadline->getTimestamp(),
        'status' => 'open',
        'created_at' => time()
    ]);

    $gameId = (int) Db::i()->select(
    'id',
    'mafiamanager_games',
    ['topic_id=?', $topicId]
)->first();

$groups = [
    'mm_players_normal' => 1,
    'mm_players_double' => 2,
    'mm_players_zero' => 0
];

$players = [];

foreach ($groups as $field => $weight) {
    $selected = $values[$field] ?? [];

    if ($selected instanceof \IPS\Member) {
        $selected = [$selected];
    } elseif ($selected instanceof \Traversable) {
        $selected = iterator_to_array($selected);
    } elseif (is_string($selected)) {
        $selected = explode(',', $selected);
    }

    if (!is_array($selected)) {
        continue;
    }

    foreach ($selected as $member) {
        $memberId = $member instanceof \IPS\Member
            ? (int) $member->member_id
            : (is_numeric($member) ? (int) $member : 0);

        if ($memberId > 0) {
            $players[$memberId] = $weight;
        }
    }
}

foreach ($players as $memberId => $weight) {
    Db::i()->insert('mafiamanager_players', [
        'game_id' => $gameId,
        'member_id' => $memberId,
        'weight' => $weight
    ]);
}
}

public function sidebar( BaseItem $item ): string
{
    try {
        $game = Db::i()->select(
            '*',
            'mafiamanager_games',
            ['topic_id=?', (int) $item->tid]
        )->first();
    }
    catch (\UnderflowException $e) {
        return '';
    }

    $gameId = (int) $game['id'];

    $players = (int) Db::i()->select(
        'COUNT(*)',
        'mafiamanager_players',
        ['game_id=?', $gameId]
    )->first();

    $votes = (int) Db::i()->select(
        'COUNT(*)',
        'mafiamanager_votes',
        ['game_id=?', $gameId]
    )->first();

    $deadline = gmdate(
        'd.m.Y H:i',
        (int) $game['voting_deadline']
    );

    $status = $game['status'] === 'open'
        ? 'Отворено'
        : 'Затворено';

        $manageHtml = '';

$viewer = \IPS\Member::loggedIn();

if (
    (int) $viewer->member_id > 0 &&
    (
        (int) $viewer->member_id === (int) $game['manager_id']
        || $viewer->isAdmin()
    )
) {
    $url = \IPS\Http\Url::internal(
        'app=mafiamanager&module=games&controller=index'
        . '&do=roster&topic_id=' . (int) $item->tid,
        'front'
    );

    $manageHtml = '<p><a class="ipsButton ipsButton_primary" href="'
        . htmlspecialchars((string) $url, ENT_QUOTES, 'UTF-8')
        . '">Управление на играчите</a></p>';
}

    return '
        <div class="ipsBox ipsPadding">
            <h3>Гласуване за елиминация</h3>
            <p>Край: ' . $deadline . ' UTC</p>
            <p>Статус: ' . $status . '</p>
            <hr>
            <p>Играчите: ' . $players . '</p>
            <p>Гласували: ' . $votes . '</p>' .
            $manageHtml .
        '</div>
    ';
}
}
