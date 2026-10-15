<?php
/**
 * @brief		Converter Vanilla Class
 * @author		<a href='https://www.invisioncommunity.com'>Invision Power Services, Inc.</a>
 * @copyright	(c) Invision Power Services, Inc.
 * @package		IPS Social Suite
 * @subpackage	convert
 * @since		21 Jan 2015
 */

namespace IPS\convert\Software\Core;

/* To prevent PHP errors (extending class does not exist) revealing path */

use DateTimeZone;
use DomainException;
use erusev\Parsedown;
use IPS\Application;
use IPS\Content;
use IPS\Content\Search\Index;
use IPS\convert\App;
use IPS\convert\Form\Reactionmapper;
use IPS\convert\Software;
use IPS\convert\Tools\Vanilla\AST;
use IPS\convert\Tools\Vanilla\QuillListeners\EmbedExternal;
use IPS\convert\Tools\Vanilla\QuillListeners\Emoji;
use IPS\convert\Tools\Vanilla\QuillListeners\Mention;
use IPS\core\ProfileFields\Field as ProfileField;
use IPS\Data\Cache;
use IPS\Data\Store;
use IPS\DateTime;
use IPS\Db;
use IPS\Helpers\Form\Select;
use IPS\Helpers\Form\Text;
use IPS\Http\Url;
use IPS\Http\Url\Friendly;
use IPS\IPS;
use IPS\Login;
use IPS\Member;
use IPS\Member\Club;
use IPS\Patterns\ActiveRecordIterator;
use IPS\Request;
use IPS\Task;
use nadar\quill\Lexer as QuillLexer;
use OutOfRangeException;
use PasswordHash;
use UnderflowException;
use function count;
use function defined;
use function is_array;
use function unserialize;
use const PATHINFO_BASENAME;
use const PATHINFO_DIRNAME;

if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * Vanilla Core Converter
 */
class Vanilla extends Software
{
	/**
	 * Constructor
	 *
	 * @param	App	$app	The application to reference for database and other information.
	 * @param	bool				$needDB	Establish a DB connection
	 * @return	void
	 * @throws	InvalidArgumentException
	 */
	public function __construct( App $app, bool $needDB=TRUE )
	{
		parent::__construct( $app, $needDB );

		/* Check for temp table */
		if ( $needDB )
		{
			if( !Db::i()->checkForTable( 'convert_vanilla_temp' ) )
			{
				Db::i()->createTable( [
					'name'		=> 'convert_vanilla_temp',
					'columns'	=> [
						'id' => [
							'name'			=> 'id',
							'type'			=> 'int',
							'length'		=> 10,
							'allow_null'	=> false,
							'auto_increment'	=> true
						],
						'media_id' => [
							'name'			=> 'media_id',
							'type'			=> 'int',
							'length'		=> 10,
							'allow_null'	=> false,
							'auto_increment'	=> false
						],
						'link_type' => [
							'name'			=> 'link_type',
							'type'			=> 'varchar',
							'length'		=> 255,
							'allow_null'	=> true,
							'default'		=> null
						],
						'content_id' => [
							'name'			=> 'content_id',
							'type'			=> 'int',
							'length'		=> 10,
							'allow_null'	=> false,
							'default'		=> 0
						],
						'post_id' => [
							'name'			=> 'post_id',
							'type'			=> 'int',
							'length'		=> 10,
							'allow_null'	=> false,
							'default'		=> 0
						],
					],
					'indexes'	=> [
						'PRIMARY' => [
							'type'		=> 'primary',
							'name'		=> 'PRIMARY',
							'columns'	=> [ 'id', 'media_id' ],
							'length'	=> [ NULL ]
						],
						'lookup' => [
							'type'		=> 'index',
							'name'		=> 'lookup',
							'columns'	=> [ 'media_id', 'link_type' ],
							'length'	=> [ NULL, NULL ]
						],
					]
				] );
			}
		}
	}

	/**
	 * Software Name
	 *
	 * @return    string
	 */
	public static function softwareName(): string
	{
		/* Child classes must override this method */
		return "Vanilla Cloud";
	}

	/**
	 * Software Key
	 *
	 * @return    string
	 */
	public static function softwareKey(): string
	{
		/* Child classes must override this method */
		return "vanilla";
	}

	/**
	 * Can we convert settings?
	 *
	 * @return    boolean
	 */
	public static function canConvertSettings(): bool
	{
		return TRUE;
	}

	/**
	 * Settings Map Listing
	 *
	 * @return    array
	 */
	public function settingsMapList(): array
	{
		$settings = [
			'fluid'	=> [ 'title' => Member::loggedIn()->language()->addToStack( 'use_fluid_view_convert' ), 'value' => true, 'our_key' => 'use_fluid_view_convert', 'our_title' => Member::loggedIn()->language()->addToStack( 'use_fluid_view_convert' ) ]
		];
		
		return $settings;
	}

	/**
	 * Convert one or more settings
	 *
	 * @param	array	$settings	Settings to convert
	 * @return	void
	 */
	public function convertSettings( array $settings=array() ) : void
	{
		if ( !isset( $settings['use_fluid_view_convert'] ) OR !$settings['use_fluid_view_convert'] )
		{
			return;
		}

		Db::i()->update( 'core_sys_conf_settings', array( 'conf_value' => 'fluid' ), array( "conf_key=?", 'forums_default_view' ) );
	}

	/**
	 * Resolve the filesystem location of a file from a path stored in the database
	 * There are several different ways Vanilla may store these, including as remote URL's
	 *
	 * @param   string	$location       File location retrieved from the database
	 * @param   string	$uploadsPath    Configured uploads path
	 * @return  Url|string|null
	 */
	public static function parseMediaLocation( string $location, string $uploadsPath ) : Url|string|null
	{
		$uploadsPath = str_replace( '\\', '/', $uploadsPath );

		// URL
		if ( preg_match( '`^https?://`', $location ) )
		{
			return Url::external( $location );
		}
		// Full filesystem path
		elseif ( mb_strpos( $location, $uploadsPath ) === 0 )
		{
			return $location;
		}
		// Deprecated "plugin based" path
		elseif ( preg_match( '`^~([^/]*)/(.*)$`', $location, $matches ) )
		{
			return rtrim( $uploadsPath, '/' ) . '/' . $matches[2];
		}
		else
		{
			$parts = parse_url( $location );
			if ( empty( $parts['scheme'] ) )
			{
				return rtrim( $uploadsPath, '/' ) . '/' . $location;
			}
			else
			{
				if ( !isset( $parts['path'], $parts['host'] ) )
				{
					return null;
				}

				// This is a url in the format type:://domain/path.
				$result = array(
					'name'   => ltrim( $parts['path'], '/'),
					'type'   => $parts['scheme'],
					'domain' => $parts['host']
				);

				// Some Vanilla communities seem to have double encoded percent encoded characters
				$parts['path'] = str_replace( '%25', '%', $parts['path'] );

				return rtrim( $uploadsPath, '/' ) . '/' . ltrim( $parts['path'], '/' );

				// @TODO: This is deprecated, and I'm not sure what it was for.
				#$format = "{$result['type']}://{$result['domain']}/%s";
				#return sprintf( $format, $result['name'] );
			}
		}
	}

	/**
	 * Attempt to convert a MySQL datetime string into a unix timestamp
	 *
	 * @param   string  $date   Date(Time) string
	 * @return  DateTime    Timestamp on successful conversion, otherwise NULL
	 */
	public static function mysqlToDateTime( string $date ) : DateTime
	{
		return DateTime::ts( strtotime( $date ) ?: time() );
	}

	/**
	 * Content we can convert from this software.
	 *
	 * @return    array|null
	 */
	public static function canConvert(): ?array
	{
		return [
			'convertGroups'        => [
				'table'     => 'Role',
				'where'     => NULL
			],
			'convertProfileFields'			=> [
				'table'		=> 'profileField',
				'where'		=> [ 'enabled=?', 1 ]
			],
			'convertMembers'       => [
				'table'         => 'User',
				'where'         => [ "Deleted<>?", 1 ],
			],
			'convertReactions'       => [
				'table'         => 'ReactionType',
				'where'         => [ "Class!=? AND Attributes NOT LIKE '%\"Permission\":\"Garden.Curation.Manage\"%'", 'Flag' ],
			],
			'convertPrivateMessages'  => [
				'table'     => 'Conversation',
				'where'     => NULL
			],
			'convertPrivateMessageReplies'	=> [
				'table'		=> 'ConversationMessage',
				'where'		=> NULL,
			],
			'convertClubs'					=> [
				'table'		=> 'Group',
				'where'		=> NULL
			],
			'convertClubMembers'			=> [
				'table'		=> 'UserGroup',
				'where'		=> NULL
			],
			'convertAttachments'			=> [
				'table'		=> 'Media',
				'where'		=> [ "ForeignTable IN ('embed')" ]
			]
		];
	}

	/**
	 * Can we convert passwords from this software.
	 *
	 * @return    boolean
	 */
	public static function loginEnabled(): bool
	{
		return TRUE;
	}

	/**
	 * Returns a block of text, or a language string, that explains what the admin must do to start this conversion
	 *
	 * @return    string|null
	 */
	public static function getPreConversionInformation(): ?string
	{
		return 'convert_vanilla_preconvert';
	}

	/**
	 * List of conversion methods that require additional information
	 *
	 * @return    array
	 */
	public static function checkConf(): array
	{
		return [
			'convertGroups',
			'convertMembers',
			'convertProfileFields',
			'convertReactions'
		];
	}

	/**
	 * Get More Information
	 *
	 * @param string $method	Conversion method
	 * @return    array|null
	 */
	public function getMoreInfo( string $method ): ?array
	{
		switch( $method )
		{
			case 'convertGroups':
				$return['convertGroups'] = array();

				$options = array();
				$options['none'] = 'None';
				foreach( new ActiveRecordIterator( Db::i()->select( '*', 'core_groups' ), 'IPS\Member\Group' ) AS $group )
				{
					$options[ $group->g_id ] = $group->name;
				}

				foreach( $this->db->select( '*', 'Role' ) AS $group )
				{
					Member::loggedIn()->language()->words["map_group_{$group['RoleID']}"]		= $group['Name'];
					Member::loggedIn()->language()->words["map_group_{$group['RoleID']}_desc"]	= Member::loggedIn()->language()->addToStack( 'map_group_desc' );

					$return['convertGroups']["map_group_{$group['RoleID']}"] = array(
						'field_class'		=> 'IPS\\Helpers\\Form\\Select',
						'field_default'		=> NULL,
						'field_required'	=> FALSE,
						'field_extra'		=> array( 'options' => $options ),
						'field_hint'		=> NULL,
					);
				}
				break;

			case 'convertMembers':
				$return['convertMembers'] = array();

				/* Find out where the photos live */
				Member::loggedIn()->language()->words['attach_location_desc'] = Member::loggedIn()->language()->addToStack( 'attach_location' );
				$return['convertMembers']['attach_location'] = array(
					'field_class'			=> 'IPS\\Helpers\\Form\\Text',
					'field_default'			=> NULL,
					'field_required'		=> TRUE,
					'field_extra'			=> array(),
					'field_hint'			=> Member::loggedIn()->language()->addToStack('convert_vanilla_photopath'),
				);
				break;

			case 'convertProfileFields':
				$return['convertProfileFields'] = $options = [];

				$options['none'] = Member::loggedIn()->language()->addToStack( 'none' );
				foreach( new ActiveRecordIterator( Db::i()->select( '*', 'core_pfields_data' ), ProfileField::class ) AS $field )
				{
					$options[ $field->_id ] = $field->_title;
				}

				foreach( $this->db->select( '*', 'profileField' ) AS $field )
				{
					Member::loggedIn()->language()->words["map_pfield_{$field['apiName']}"]			= $field['label'];
					Member::loggedIn()->language()->words["map_pfield_{$field['apiName']}_desc"]	= Member::loggedIn()->language()->addToStack( 'map_pfield_desc' );

					$return['convertProfileFields']["map_pfield_{$field['apiName']}"] = [
						'field_class'		=> Select::class,
						'field_default'		=> NULL,
						'field_required'	=> FALSE,
						'field_extra'		=> [ 'options' => $options ],
						'field_hint'		=> NULL,
					];
				}
				break;

			case 'convertReactions':
				$return['convertReactions'] = [];

				$reactions = [];
				foreach( iterator_to_array( $this->db->select( '*', 'ReactionType', [ "Class!=? AND Attributes NOT LIKE '%\"Permission\":\"Garden.Curation.Manage\"%'", 'Flag' ] ) ) as $reaction )
				{
					$reactions[ $reaction['UrlCode'] ] = [
						'title' => $reaction['Name'],
						'icon' => FALSE
					];
				}

				$return['convertReactions']['reactions'] = [
					'field_class'		=> Reactionmapper::class,
					'field_default'		=> NULL,
					'field_required'	=> TRUE,
					'field_extra'		=> [ 'reactions' => $reactions ],
					'field_hint'		=> NULL,
					'field_validation'	=> NULL,
				];

				Member::loggedIn()->language()->words['reaction_path'] = Member::loggedIn()->language()->addToStack( 'source_path', FALSE, [ 'sprintf' => [ 'Vanilla' ] ] );
				Member::loggedIn()->language()->words['reaction_path_desc'] = "If you are using .SVG Reactions, configure them before converting.";
				$return['convertReactions']['reaction_path'] = [
					'field_class'		=> Text::class,
					'field_default'		=> NULL,
					'field_required'	=> TRUE,
					'field_extra'		=> [],
					'field_hint'		=> NULL,
					'field_validation'	=> function( $value ) { if ( !@is_dir( $value ) ) { throw new DomainException( 'path_invalid' ); } },
				];
				break;
		}

		return ( isset( $return[ $method ] ) ) ? $return[ $method ] : [];
	}

	/**
	 * Finish - Adds everything it needs to the queues and clears data store
	 *
	 * @return    array        Messages to display
	 */
	public function finish(): array
	{
		/* Search Index Rebuild */
		Index::i()->rebuild();

		/* Clear Cache and Store */
		Store::i()->clearAll();
		Cache::i()->clearAll();

		/* Non-Content Rebuilds */
		Task::queue( 'convert', 'RebuildProfilePhotos', array( 'app' => $this->app->app_id ), 5, array( 'app' ) );
		Task::queue( 'convert', 'RebuildNonContent', array( 'app' => $this->app->app_id, 'link' => 'core_message_posts', 'extension' => 'core_Messaging' ), 2, array( 'app', 'link', 'extension' ) );
		Task::queue( 'convert', 'RebuildNonContent', array( 'app' => $this->app->app_id, 'link' => 'core_members', 'extension' => 'core_Signatures' ), 2, array( 'app', 'link', 'extension' ) );

		/* Content Counts */
		Task::queue( 'core', 'RecountMemberContent', array( 'app' => $this->app->app_id ), 4, array( 'app' ) );

		/* First Post Data */
		Task::queue( 'convert', 'RebuildConversationFirstIds', array( 'app' => $this->app->app_id ), 2, array( 'app' ) );

		/* Attachments */
		Task::queue( 'core', 'RebuildAttachmentThumbnails', array( 'app' => $this->app->app_id ), 1, array( 'app' ) );

		/* Remove temp table */
		Db::i()->dropTable('convert_vanilla_temp');

		return array( "f_search_index_rebuild", "f_clear_caches", "f_rebuild_pms", "f_signatures_rebuild", "f_rebuild_attachments" );
	}

	/**
	 * @brief   Store parsedown object
	 */
	protected static ?Parsedown $_parseDown = NULL;

	/**
	 * Pre-process content for the Invision Community text parser
	 *
	 * @param	string			The post
	 * @param	string|null		Content Classname passed by post-conversion rebuild
	 * @param	int|null		Content ID passed by post-conversion rebuild
	 * @param	App|null		App object if available
	 * @return	string			The converted post
	 */
	public static function fixPostData( string $post, ?string $className=null, ?int $contentId=null, ?App $app=null ): string
	{
		/* Is this Markdown? */
		if( mb_substr( $post, 0, 15 ) == '<!--Markdown-->' )
		{
			/* Load parser */
			if( static::$_parseDown === NULL )
			{
				IPS::$PSR0Namespaces['erusev'] = \IPS\ROOT_PATH . "/applications/convert/sources/Tools/Vanilla/Parsedown";
				static::$_parseDown = new Parsedown();
			}

			$post = str_replace( '<!--Markdown-->', '', $post );
			$post = static::$_parseDown->text( $post );
		}
		/* If rich, we've already processed it, but need to skip the legacy formatting */
		elseif( mb_substr( $post, 0, 11 ) == '<!--Rich-->' OR mb_substr( $post, 0, 12 ) == '<!--Rich2-->' )
		{
			$post = str_replace( [ '<!--Rich-->', '<!--Rich2-->' ], '', $post );
		}
		/* Deltas still tha haven't been previously processed */
		elseif( mb_substr( $post, 0, 3 ) == '[{"' )
		{
			$post = static::processQuill( $post, $app );

			/* Still not parsed? */
			if( mb_substr( $post, 0, 3 ) == '[{"' )
			{
				$post = AST::parse( $post, $app );
			}
		}
		/* LEGACY CONVERSIONS BELOW FOR OLDER CONTENT */
		else
		{
			/* Mentions */
			$matches = [];
			preg_match_all( '/@("|&quot;)([^@"]+)("|&quot;)/i', $post, $matches );

			if( count( $matches ) )
			{
				foreach( $matches[0] as $key => $tag )
				{
					$member = Member::load( $matches[2][ $key ], 'name' );
					if( !$member->member_id )
					{
						continue;
					}

					$post = str_replace( $tag, "[mention={$member->member_id}]{$member->name}[/mention]", $post );
				}
			}

			/**
			 * Vanilla has a quotes plugin that seems to have changed formats quite often. - We'll try to match as many formats as we can
			 */
			$post = preg_replace( '/(?:<blockquote\s+(?:class=\"(?:User)?Quote\")?(?:\s+rel=\"(?:[^\"]+)\")?>)(?:\s+)?<div class=\"QuoteAuthor\">([^\"]+)<\/div>(?:\s+)?<div class=\"QuoteText\">(?:<p>)?(.*?)(?:<\/p>)?<\/div>(?:\s+)?<\/blockquote>/i',
				'[quote name="$1"]$2[/quote]' ,
				$post );

			$post = preg_replace( '/(?:<blockquote\s+(?:class=\"Quote (?:User)?Quote\")?(?:\s+rel=\"(?:[^\"]+)\")?>)(?:\s+)?<div class=\"QuoteText\">(?:<p>)?(.*?)(?:<\/p>)?<\/div>(?:\s+)?<\/blockquote>/i',
				'[quote]$1[/quote]' ,
				$post );

			$post = preg_replace( '/<blockquote\s+rel=\"([^\"]+)\"?>(.*?)<\/blockquote>/i',
				'[quote name="$1"]$2[/quote]' ,
				$post );

			$post = preg_replace( '/<blockquote>(.*?)<\/blockquote>/ims',
				'[quote]$1[/quote]' ,
				$post );
		}

		return $post;
	}

	/**
	 * Convert groups
	 *
	 * @return 	void
	 */
	public function convertGroups() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'r.RoleID' );

		/* Run conversions */
		foreach ( $this->fetch( array( 'Role', 'r' ), 'RoleID' ) as $row )
		{
			$info = array(
				'g_id'      => $row['RoleID'],
				'g_name'    => $row['Name'],
			);
			$merge = ( $this->app->_session['more_info']['convertGroups']["map_group_{$row['RoleID']}"] != 'none' )
				? $this->app->_session['more_info']['convertGroups']["map_group_{$row['RoleID']}"]
				: NULL;

			$libraryClass->convertGroup( $info, $merge );
			$libraryClass->setLastKeyValue( $row['RoleID'] );
		}

		/* Now check for group promotions */
		if( count( $libraryClass->groupPromotions ) )
		{
			foreach( $libraryClass->groupPromotions as $groupPromotion )
			{
				$libraryClass->convertGroupPromotion( $groupPromotion );
			}
		}
	}

	/**
	 * Convert reactions
	 *
	 * @return	void
	 */
	public function convertReactions() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::$usingKeys = FALSE;

		foreach( $this->fetch( 'ReactionType', 'UrlCode', [ "Class!=? AND Attributes NOT LIKE '%\"Permission\":\"Garden.Curation.Manage\"%'", 'Flag' ] ) as $row )
		{
			$filePath = $fileData = NULL;

			$attributes = json_decode( $row['Attributes'], TRUE );

			if( $attributes AND isset( $attributes['Photo'] ) )
			{
				$photo = static::parseMediaLocation( $attributes['Photo'], $this->app->_session['more_info']['convertReactions']['reaction_path'] );
				$filename = pathinfo( $photo, PATHINFO_BASENAME );
				$fileData = file_get_contents( $photo );
			}
			else
			{
				continue;
			}

			$points = 0;
			if( isset( $attributes['Points'] ) )
			{
				$points = (int) $attributes['Points'];
				if( (int) $attributes['Points'] > 1 )
				{
					$points = 1;
				}
			}

			$info = [
				'reaction_id' => $row['UrlCode'],
				'reaction_title' => $row['Name'],
				'filename' => $filename,
				'reaction_value' => $points,
				'reaction_position' => $row['Sort'],
				'reaction_enabled' => $row['Active']
			];

			$merge = ( $this->app->_session['more_info']['convertReactions']['reactions'][ $row['UrlCode'] ] != 'none' ) ? $this->app->_session['more_info']['convertReactions']['reactions'][ $row['UrlCode'] ] : NULL;
			$libraryClass->convertReaction( $info, $filePath, $fileData, $merge );
		}
	}

	/**
	 * Convert profile fields
	 *
	 * @return	void
	 */
	public function convertProfileFields() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::$usingKeys = FALSE;

		foreach( $this->fetch( 'profileField', 'apiName', [ 'enabled=?', 1 ] ) as $field )
		{
			$visibility = match( $field['visibility'] )
			{
				'public'	=> 'all',
				'internal'	=> 'staff',
				'private'	=> 'hide'
			};

			$type = match( $field['formType'] )
			{
				'text-multiline'	=> 'TextArea',
				default				=> 'Text',
				'dropdown'			=> 'Select',
				'checkbox', 'date', 'number' => ucfirst( $field['formType'] )
			};

			$merge = ( $this->app->_session['more_info']['convertProfileFields']["map_pfield_{$field['apiName']}"] != 'none' ) ? $this->app->_session['more_info']['convertProfileFields']["map_pfield_{$field['apiName']}"] : NULL;

			$info = array(
				'pf_id'				=> $field['apiName'],
				'pf_name'			=> $field['label'],
				'pf_desc'			=> $field['description'],
				'pf_type'			=> $type,
				'pf_content'		=> $field['dropdownOptions'],
				'pf_not_null'		=> $field['registrationOptions'] == 'required' ? 1 : 0,
				'pf_member_hide'	=> $visibility,
				'pf_member_edit'	=> ( $field['mutability'] == 'all' ) ? 1 : 0,
				'pf_position'		=> $field['sort'],
				'pf_show_on_reg'	=> ( $field['registrationOptions'] != 'hidden' ) ? 1 : 0,
				'pf_multiple'		=> false
			);

			$libraryClass->convertProfileField( $info, $merge );
		}
	}

	/**
	 * Convert members
	 *
	 * @return 	void
	 */
	public function convertMembers() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'u.UserID' );

		$uploadsPath = $this->app->_session['more_info']['convertMembers']['attach_location'];

		$users = $this->fetch( array( 'User', 'u' ), 'u.UserID', array( "u.Deleted<>?", 1 ) );

		$data = iterator_to_array( $users );
		$userIds = array_column( $data, 'UserID' );
		$roles = array_fill_keys( $userIds, [] );
		foreach( $this->db->select( '*', 'UserRole', [ $this->db->in( 'UserID', $userIds ) ] ) as $role )
		{
			$roles[ $role['UserID'] ][] = $role['RoleID'];
		}

		foreach( $data AS $row )
		{
			/* Work out birthday */
			$bdayDay = $bdayMonth = $bdayYear = $signatureFormat = $signatureText = NULL;
			$fields = [];

			$dateOfBirth = !empty( $row['DateOfBirth'] ) ? @DateTime::ts( strtotime( $row['DateOfBirth'] ) ) : NULL;
			if ( $dateOfBirth instanceof DateTime )
			{
				$bdayYear  = $dateOfBirth->format( 'Y' );
				$bdayMonth = $dateOfBirth->format( 'n' );
				$bdayDay   = $dateOfBirth->format( 'j' );
			}

			/* Work out banned stuff */
			$tempBan = ( $row['Banned'] == 1 ) ? -1 : 0;

			/* Fetch UserMeta */
			foreach( $this->db->select( '*', 'UserMeta', [ 'UserID=?', $row['UserID'] ] ) as $meta )
			{
				switch( $meta['Name'] )
				{
					case 'Plugin.Signatures.Format':
						$signatureFormat = $meta['Value'];
						break;
					case 'Plugin.Signatures.Sig':
						$signatureText = $meta['Value'];
						break;
					default:
						if( str_starts_with( $meta['Name'], 'Profile.' ) )
						{
							$fields[  str_replace( 'Profile.', '', $meta['Name'] ) ] = $meta['Value'];
						}
				}
			}

			if( !empty( $signatureFormat ) AND !empty( $signatureText ) )
			{
				$signatureFormat = strtolower( $signatureFormat );
				if( $signatureFormat == 'markdown' )
				{
					$signatureText = '<!--Markdown-->' . $signatureText;
				}
				elseif( $signatureFormat == 'rich' )
				{
					$signatureText = static::processQuill( $signatureText, $this->app );
				}
				elseif( $signatureFormat == 'rich2' )
				{
					$signatureText = AST::parse( $signatureText, $this->app );
				}
				$signatureText = preg_replace( "/\[ATTACH=\d+\]\s*<br>/i", '', $signatureText );
			}

			/* Empty Signatures */
			if( $signatureText === '[{"type":"p","children":[{"text":""}]}]' OR $signatureText === '[{"children":[{"text":""}],"type":"p"}]' )
			{
				$signatureText = '';
			}

			/* Get IP */
			try
			{
				$ipAddress = ( $row['InsertIPAddress'] AND !str_contains( $row['InsertIPAddress'], '.' ) ) ? inet_ntop( $row['InsertIPAddress'] ) : $row['InsertIPAddress'];
			}
			catch( \ErrorException $e )
			{
				$ipAddress = '';
			}

			if( !empty( $row['RoleID'] ) )
			{
				array_unshift( $roles[ $row['UserID'] ], $row['RoleID'] );
			}

			$allRoles = array_unique( $roles[ $row['UserID'] ] );
			$primaryRole = NULL;
			$secondaryRoles = [];

			/* Find a primary role. */
			if( count( $allRoles ) )
			{
				$primaryRole = array_shift( $allRoles );
			}

			/* Any remaining roles will be secondary */
			if( count( $allRoles ) )
			{
				$secondaryRoles = $allRoles;
			}

			/* Array of basic data */
			$info = array(
				'member_id'       => $row['UserID'],
				'email'           => $row['Email'],
				'name'            => $row['Name'],
				'password'        => $row['Password'],
				'member_group_id'    => $primaryRole,
				'mgroup_others'		=> $secondaryRoles,
				'joined'          => static::mysqlToDateTime( $row['DateInserted'] ),
				'ip_address'      => $ipAddress,
				'temp_ban'        => $tempBan,
				'bday_day'        => $bdayDay,
				'bday_month'      => $bdayMonth,
				'bday_year'       => $bdayYear,
				'msg_count_new'   => (int) $row['CountUnreadDiscussions'],
				'msg_count_total' => (int) $row['CountDiscussions'],
				'last_visit'      => $row['DateLastActive'] ? static::mysqlToDateTime( $row['DateLastActive'] ) : NULL,
				'timezone'        => !empty( $row['HourOffset'] )
					? (int) $row['HourOffset']
					: new DateTimeZone(
						'UTC'
					),
				'member_posts'    => (int) $row['CountComments'],
				'signature'		  => $signatureText,
			);

			/* Profile Photos */
			$filepath = NULL;
			$filename = NULL;

			if ( !empty( $row['Photo'] ) AND ( $location = static::parseMediaLocation( $row['Photo'], $uploadsPath ) ) )
			{
				if ( $location instanceof Url )
				{
					/* The library uses file_get_contents() so we can just pop the file name off and pass the URL directly */
					$filebits = explode( '/', (string) $location );
					$filename = array_pop( $filebits );
					$filepath = implode( '/', $filebits );
				}
				else
				{
					// Full-sized profile photos start with "p", small profile photos start with "n"
					$filename = 'p' . pathinfo( $location, PATHINFO_BASENAME );
					$filepath = pathinfo( $location, PATHINFO_DIRNAME );
				}

			}

			/* Finally */
			$libraryClass->convertMember( $info, $fields, $filename, $filepath );
			$libraryClass->setLastKeyValue( $row['UserID'] );
		}
	}

	/**
	 * Convert PMs
	 *
	 * @return 	void
	 */
	public function convertPrivateMessages() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'ConversationID' );

		$data = iterator_to_array( $this->fetch( 'Conversation', 'ConversationID' ) );
		$this->app->preCacheLinks( $data, [ 'core_members' => 'InsertUserID' ] );

		/* Run conversions */
		foreach ( $data as $row )
		{
			/* Message topic information */
			//$firstMessageId = $row['FirstMessageID'];
			$topicInfo = array(
				'mt_id'             => $row['ConversationID'],
				'mt_title'          => $row['Subject'] ?: NULL,
				'mt_date'           => static::mysqlToDateTime( $row['DateInserted'] ),
				'mt_starter_id'     => $row['InsertUserID'],
				'mt_last_post_time' => static::mysqlToDateTime( $row['DateUpdated'] ),
				'mt_to_count'       => ( isset( $row['CountParticipants'] ) ) ? $row['CountParticipants'] : count( unserialize( $row['Contributors'] ) ),
				'mt_replies'        => $row['CountMessages'],
			);

			/* Message maps */
			$maps = array();
			$rows = iterator_to_array( $this->db->select( '*', 'UserConversation', array( 'ConversationID=?', $row['ConversationID'] ) ) );
			$this->app->preCacheLinks( $rows, [ 'core_members' => 'UserID' ] );
			foreach ( $rows as $r )
			{
				$maps[ $r['UserID'] ] = array(
					'map_user_id'           => $r['UserID'],
					'map_read_time'         => $r['DateLastViewed'] ? static::mysqlToDateTime( $r['DateLastViewed'] ) : NULL,
					//'map_folder_id'        => TODO: Create a Bookmarks folder for "Bookmarked" conversations?
					'map_user_active'       => $r['Deleted'] == 0 ? 1 : 0,
					'map_last_topic_reply'  => $r['DateConversationUpdated'] ? static::mysqlToDateTime( $r['DateConversationUpdated'] ) : NULL
				);
			}

			$libraryClass->convertPrivateMessage( $topicInfo, $maps );
			$libraryClass->setLastKeyValue( $row['ConversationID'] );
		}
	}

	/**
	 * Convert PM replies
	 *
	 * @return 	void
	 */
	public function convertPrivateMessageReplies() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'MessageID' );

		$data = iterator_to_array( $this->fetch( 'ConversationMessage', 'MessageID' ) );
		$this->app->preCacheLinks( $data, [ 'core_members' => 'InsertUserID', 'core_message_topics' => 'ConversationID' ] );

		foreach( $data AS $row )
		{
			// Add Format Type (for later processing) if Markdown
			if( $row['Format'] == 'Markdown' )
			{
				$row['Body'] = '<!--Markdown-->' . $row['Body'];
			}
			elseif( $row['Format'] == 'Rich' )
			{
				$row['Body'] = static::processQuill( $row['Body'], $this->app, 'core_message_posts', $row['ConversationID'], $row['MessageID'] );
			}
			elseif( $row['Format'] == 'Rich2' )
			{
				$row['Body'] = AST::parse( $row['Body'], $this->app, 'core_message_posts', $row['ConversationID'], $row['MessageID'] );
			}

			/* Get IP */
			try
			{
				$ipAddress = ( $row['InsertIPAddress'] AND !str_contains( $row['InsertIPAddress'], '.' ) ) ? inet_ntop( $row['InsertIPAddress'] ) : $row['InsertIPAddress'];
			}
			catch( \ErrorException $e )
			{
				$ipAddress = '';
			}

			$libraryClass->convertPrivateMessageReply( array(
				'msg_id'            => $row['MessageID'],
				'msg_topic_id'      => $row['ConversationID'],
				'msg_date'          => static::mysqlToDateTime( $row['DateInserted'] ),
				'msg_post'          => $row['Body'],
				'msg_author_id'     => $row['InsertUserID'],
				'msg_ip_address'    => $ipAddress
			) );
			
			$libraryClass->setLastKeyValue( $row['MessageID'] );
		}
	}

	/**
	 * Convert clubs
	 *
	 * @return	void
	 */
	public function convertClubs() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'GroupID' );

		foreach( $this->fetch( 'Group', 'GroupID' ) AS $group )
		{
			switch( $group['Privacy'] )
			{
				case 'Public':
					$type = ( $group['Visibility'] != 'Members' ) ? 'public' : 'open';
					break;

				case 'Private':
					$type = 'closed';
					break;

				default:
				case 'Secret':
					$type = 'private';
					break;
			}

			$icon = $iconPath = $cover = $coverPath = NULL;
			if( $group['Icon'] )
			{
				$icon = pathinfo( $group['Icon'], PATHINFO_BASENAME );
				$iconPath = static::parseMediaLocation( $group['Icon'], $this->app->_session['more_info']['convertMembers']['attach_location'] );
			}

			if( $group['Banner'] )
			{
				$cover = pathinfo( $group['Banner'], PATHINFO_BASENAME );
				$coverPath = static::parseMediaLocation( $group['Banner'], $this->app->_session['more_info']['convertMembers']['attach_location'] );
			}

			$description = '';
			if( $group['Format'] == 'Markdown' )
			{
				$description = '<!--Markdown-->' . $group['Description'];
			}
			elseif( $group['Format'] == 'Rich' )
			{
				$description = static::processQuill( $group['Description'], $this->app );
			}
			elseif( $group['Format'] == 'Rich2' )
			{
				$description = AST::parse( $group['Description'], $this->app );
			}
			$description = preg_replace( "/\[ATTACH=\d+\]\s*<br>/i", '', $description );

			$info = [
				'club_id'		=> $group['GroupID'],
				'name'			=> $group['Name'],
				'about'			=> strip_tags( $description ),
				'type'			=> $type,
				'created'		=> static::mysqlToDateTime( $group['DateInserted'] ),
				'members'		=> $group['CountMembers'],
				'owner'			=> $group['InsertUserID'],
				'profile_photo'	=> $icon,
				'cover_photo'	=> $cover,
				'last_activity'	=> $group['DateLastComment'] ? static::mysqlToDateTime( $group['DateLastComment'] ) : null
			];

			$libraryClass->convertClub( $info, iconfile: $iconPath, coverfile: $coverPath );
			$libraryClass->setLastKeyValue( $group['GroupID'] );
		}
	}

	/**
	 * Convert club members
	 *
	 * @return	void
	 */
	public function convertClubMembers() : void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::$usingKeys = FALSE;

		foreach( $this->fetch( 'UserGroup', 'GroupID' ) AS $member )
		{
			$type = match( $member['Role'] )
			{
				'Leader'	=> 'leader',
				'Member'	=> 'member'
			};

			$libraryClass->convertClubMember( array(
				'club_id'		=> $member['GroupID'],
				'member_id'		=> $member['UserID'],
				'joined'		=> static::mysqlToDateTime( $member['DateInserted'] ),
				'status'		=> $type,
			) );
		}
	}

	/**
	 * @brief   temporarily store post content
	 */
	protected array $_postContent = array();

	/**
	 * Convert attachments
	 *
	 * @return	void
	 */
	public function convertAttachments(): void
	{
		$libraryClass = $this->getLibrary();
		$libraryClass::setKey( 'MediaID' );
		$this->_postContent = [];

		foreach( $this->fetch( 'Media', 'MediaID', [ $this->db->in( 'ForeignTable', [ 'embed' ] ) ] ) AS $row )
		{
			$mediaRows = iterator_to_array( 
				\IPS\Db::i()->select( 
					'*', 
					'convert_vanilla_temp', 
					[ 'media_id=? AND ' . \IPS\Db::i()->in( 'link_type', [ 'core_message_posts' ] ), $row['MediaID'] ] 
			) );

			// Nothing to do, attachment must be in another content type
			if( !count( $mediaRows ) )
			{
				$libraryClass->setLastKeyValue( $row['MediaID'] );
				continue;
			}

			$map = [
				'id1'	=> $mediaRows[0]['content_id'],
				'id2'	=> $mediaRows[0]['post_id']
			];
			
			$map['id1_type']		= 'core_message_topics';
			$map['id2_type']		= 'core_message_posts';
			$map['location_key']	= 'core_Messaging';
			$map['id1_from_parent'] = FALSE;
			$map['id2_from_parent'] = FALSE;
			$map['id3_skip_link'] = TRUE;

			/* File extension */
			$ext = explode( '.', $row['Path'] );
			$ext = array_pop( $ext );

			$info = array(
				'attach_id'			=> $row['MediaID'],
				'attach_file'		=> $row['Name'],
				'attach_date'		=> static::mysqlToDateTime( $row['DateInserted'] ),
				'attach_member_id'	=> $row['InsertUserID'],
				'attach_hits'		=> 0,
				'attach_ext'		=> $ext,
				'attach_filesize'	=> $row['Size'],
			);

			$uploadPath = static::parseMediaLocation( $row['Path'], $this->app->_session['more_info']['convertMembers']['attach_location'] );

			$attachId = $libraryClass->convertAttachment( $info, $map, $uploadPath );

			/* Do some re-jiggery on the post itself to make sure attachment displays */
			if ( $attachId !== FALSE )
			{
				foreach( $mediaRows as $mediaRow )
				{
					try
					{
						$pid = $this->app->getLink( $map['id2'], 'core_message_posts' );

						if( !isset( $this->_postContent[ $pid ] ) )
						{
							$this->_postContent[ $pid ] = Db::i()->select( 'msg_post', 'core_message_posts', array( "msg_id=?", $pid ) )->first();
						}

						$this->_postContent[ $pid ] = str_replace( "[ATTACH={$row['MediaID']}]", '[attachment=' . $attachId . ':name]', $this->_postContent[ $pid ] );
					}
					catch( UnderflowException|OutOfRangeException $e ) {}
				}
			}

			unset( $mediaRows );
			$libraryClass->setLastKeyValue( $row['MediaID'] );
		}

		/* Do the updates */
		foreach( $this->_postContent as $pid => $content )
		{
			Db::i()->update( 'core_message_posts', array( 'msg_post' => $content ), array( 'msg_id=?', $pid ) );
		}
	}

	/**
	 * Process a login
	 *
	 * @param	Member		$member			The member
	 * @param	string			$password		Password from form
	 * @return	bool
	 */
	public static function login( Member $member, string $password ) : bool
	{
		/* Vanilla 2.2 */
		if( preg_match( '/^\$2[ay]\$(0[4-9]|[1-2][0-9]|3[0-1])\$[a-zA-Z0-9.\/]{53}/', $member->conv_password ) OR mb_substr( $member->conv_password, 0, 3 ) == '$P$' )
		{
			require_once \IPS\ROOT_PATH . "/applications/convert/sources/Login/PasswordHash.php";
			$ph = new PasswordHash( 8, TRUE );
			return $ph->CheckPassword( $password, $member->conv_password );
		}

		if ( Login::compareHashes( $member->conv_password, md5( md5( str_replace( '&#39;', "'", html_entity_decode( $password ) ) ) . $member->misc ) ) )
		{
			return TRUE;
		}
		else
		{
			return FALSE;
		}
	}

	/**
	 * Process Quill Rich Delta
	 *
	 * @param string                $postJson
	 * @param \IPS\convert\App|null $app
	 * @param string|null           $type
	 * @param int|null              $contentId
	 * @param int|null              $commentId
	 * @return string
	 */
	public static function processQuill( string $postJson, ?App $app=null, ?string $type=null, ?int $contentId=null, ?int $commentId=null ): string
	{
		/* Need to wrap so it's an expected format */
		$post = '{"ops":' . $postJson . '}';

		if ( strpos( $post, '"header":' ) !== false )
		{
			$post = preg_replace('/{"header":{"level":(\d+),"ref":"([^"]*)"}}/', '{"header":$1}', $post );
		}

		$data = json_decode( $post, true );

		if ( !isset( $data['ops'][ count( $data['ops'] ) - 1 ]['insert'] ) OR is_array( $data['ops'][ count( $data['ops'] ) - 1 ]['insert'] ) OR \substr( $data['ops'][ count( $data['ops'] ) - 1 ]['insert'], -1 ) !== "\n" )
		{
			$data['ops'][] = [ "insert" => "\n" ];
		}

		/* Get the autoloader for the Quill library */
		require_once Application::load( 'convert' )->getApplicationPath() . '/sources/Tools/Quill/vendor/autoload.php';

		$lexer = new QuillLexer( $data );
		$lexer->registerListener( new Emoji() );
		$lexer->registerListener( new EmbedExternal( $type, $contentId, $commentId ) );
		$lexer->registerListener( new Mention( $app ) );
		try
		{
			return '<!--Rich-->' . $lexer->render();
		}
		catch( \ErrorException $e )
		{
			return $postJson;
		}
	}

	/**
	 * Check if we can redirect the legacy URLs from this software to the new locations
	 *
	 * @return    Url|NULL
	 * @note	Forums and profiles don't use an ID in the URL. While we may be able to somehow cross reference this with our SEO slug, it wouldn't be reliable.
	 */
	public function checkRedirects(): ?Url
	{
		$url = Request::i()->url();

		if( preg_match( '#/group/([0-9]+)-#i', $url->data[ Url::COMPONENT_PATH ], $matches ) )
		{
			try
			{
				$clubId = (string) $this->app->getLink( $matches[1], 'core_clubs' );
				$club = Club::load( $clubId );

				if( $club->canView() )
				{
					return $club->url();
				}
			}
			catch( OutOfRangeException ) {}
		}

		return NULL;
	}
}