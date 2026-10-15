<?php

/**
 * @brief           csrfChecker
 * @author          Invision Community
 * @package         Invision Community
 * @since           7 Oct 2019
 * @version         1.0.0
 */

if ( file_exists( '../init.php' ) )
{
	require '../init.php';
}
else
{
	require "init.php";
}

csrfCheck::run();

class csrfCheck
{
	public static $output = array();
	public static $apps = array( 'blog', 'calendar', 'cms', 'core', 'downloads', 'forums', 'gallery', 'nexus' );

    static public function run()
    {
    	if ( isset( $_REQUEST['app'] ) and $_REQUEST['app'] != '_all_' )
		{
			static::appDirectory( $_REQUEST['app'] );
		}
    	else
		{
			foreach( static::$apps as $app )
			{
				static::appDirectory( $app );
			}
		}

		static::output();
    }

	/**
	 * @param $app
	 */
    public static function appDirectory( $app )
	{
		$dirIterator = new RecursiveDirectoryIterator(
			\IPS\ROOT_PATH  . '/applications/' . $app . '/modules/admin',
			RecursiveDirectoryIterator::SKIP_DOTS
		);

		foreach( $dirIterator as $dir )
		{
			if ( $dir->isDir() )
			{
				static::controllerDirectory( $dir->getPathname() );
			}
		}
	}

	/**
	 * Check a controller's directory
	 * @param $path
	 */
    public static function controllerDirectory( $path )
	{
		$dirIterator = new RecursiveDirectoryIterator(
			$path,
			RecursiveDirectoryIterator::SKIP_DOTS
		);

		$rootName = '\IPS\\' . str_replace( '/', '\\', str_replace( \IPS\ROOT_PATH . '/applications/', '', $path ) );
		foreach ( $dirIterator as $file )
		{
			if ( mb_substr( $file->getFilename(), -4 ) == '.php' )
			{
				$className = $rootName . '\\' . str_replace( '.php', '', $file->getFilename() );

				try
				{
					$class = new ReflectionClass( $className );
					$methods = $class->getMethods();

					/* Check to see if we overload methods */
					foreach ( $methods as $method )
					{
						if ( ltrim( str_replace( '\\_' . $class->getShortName(), '\\' . $class->getShortName(), $method->class ), '\\' ) != ltrim( $className, '\\' ) )
						{
							/* We don't really want to test the parent methods */
							continue;
						}

						/* Do we need to check this method? */
						if ( static::checkMethod( $method, $class ) )
						{
							/* Check for doc block comments */
							if ( $comment = static::manuallyClearedMethod( $method, $class ) )
							{
								/* This is likely OK */
								static::$output[$className][$method->getName()] = '+ CSRF Checked: ' . $comment;
							}
							else
							{
								$code = static::getMethodContents( $file, $method );

								/* Does the code check for parent::method? */
								if ( static::basicCheckSafeParentMethod( $code, $method ) )
								{
									/* This is likely OK */
									static::$output[$className][$method->getName()] = '+ Calls parent::' . $method->getName() . '()';
								}
								else
								{
									if ( static::basicCheckCsrf( $code ) )
									{
										/* This is likely OK */
										static::$output[$className][$method->getName()] = '+ Calls \\IPS\\Session::i()->csrfCheck();';
									}
									else
									{
										if ( preg_match( '/' . preg_quote( 'new \\IPS\Helpers\\Form' ) . '/', $code ) )
										{
											/* This is likely OK */
											static::$output[ $className ][ $method->getName() ] = '+ Uses new \\IPS\Helpers\\Form';
										}
										else
										{
											if ( static::checkPartialMethod( $method, 'delete' ) )
											{
												/* Look for central method */
												if ( static::basicCheckDelete( $code ) )
												{
													/* This is likely OK */
													static::$output[$className][$method->getName()] = '+ Calls \\IPS\\Request::i()->confirmedDelete()';
												}
												else
												{
													/* This is likely NOT OK */
													static::$output[$className][$method->getName()] = '- Doesn\'t call \\IPS\\Request::i()->confirmedDelete()';
												}
											}
											else
											{
												/* This is likely NOT OK */
												static::$output[$className][$method->getName()] = '- Could not find any core method protection';
											}
										}
									}
								}
							}
						}
					}
				}
				catch (Exception $e )
				{
					static::$output[ $className ]['_error_'] = '- Error trying to load ' . $className . ' ' . $e->getMessage();
				}
			}
		}
	}

	/**
	 * @param ReflectionMethod $method
	 * @param ReflectionClass $class
	 * @return bool|string
	 */
	public static function manuallyClearedMethod( ReflectionMethod $method, ReflectionClass $class )
	{
		if ( preg_match( '#\*\s+?\@csrfChecked\s+?(.*)\n#', $method->getDocComment(), $matches ) )
		{
			return trim( $matches[1] );
		}

		return FALSE;
	}

	/**
	 * @param ReflectionMethod $method
	 * @param $methodName
	 * @return bool
	 */
	public static function checkPartialMethod( ReflectionMethod $method, $methodName ) : bool
	{
		/* Don't check partials on form (format, etc) */
		if ( $methodName == 'form' or $methodName == 'add' )
		{
			/* Camel case? */
			if ( $method->getName() == $methodName or preg_match( '#^' . $methodName . '[A-Z]#', $method->getName() ) )
			{
				return TRUE;
			}
			else
			{
				return FALSE;
			}
		}
		if ( mb_substr( $method->getName(), 0, mb_strlen( $methodName ) ) == $methodName )
		{
			return TRUE;
		}

		return FALSE;
	}

	/**
	 * @param ReflectionMethod $method
	 * @param ReflectionClass $class
	 * @return bool
	 */
	public static function checkMethod( ReflectionMethod $method, ReflectionClass $class ) : bool
	{
		foreach( static::getMethodsToCheck( $class ) as $possible )
		{
			/* Look for delete deleteForm deleteThing */
			if ( static::checkPartialMethod( $method, $possible ) )
			{
				return TRUE;
			}
		}

		return FALSE;
	}

	/**
	 * @param ReflectionClass $class
	 * @return array
	 */
	public static function getMethodsToCheck( ReflectionClass $class )
	{
		$check = array('form', 'edit', 'copy', 'reorder', 'delete', 'lock', 'unlock', 'add', 'enable', 'toggle', 'rebuild', 'recount');
		if ( $class->isSubclassOf( '\IPS\Node\Controller' ) )
		{
			$check = array_merge( $check, array('massChange', 'enableToggle') );
		}

		return $check;
	}

	/**
	 * @param $code
	 * @param ReflectionMethod $method
	 * @return bool
	 */
	public static function basicCheckSafeParentMethod( $code, ReflectionMethod $method ) : bool
	{
		if ( preg_match( '/' . preg_quote( 'parent::' . $method->getName() . '(' ) . '/', $code ) )
		{
			return TRUE;
		}

		return FALSE;
	}

	/**
	 * @param $code
	 * @return bool
	 */
	public static function basicCheckCsrf( $code ) : bool
	{
		if ( preg_match( '/' . preg_quote( '\\IPS\\Session::i()->csrfCheck();' ) . '/', $code ) )
		{
			return TRUE;
		}

		return FALSE;
	}

	/**
	 * @param $code
	 * @return bool
	 */
	public static function basicCheckDelete( $code ) : bool
	{
		if ( preg_match( '/' . preg_quote( '\\IPS\\Request::i()->confirmedDelete(' ) . '/', $code ) )
		{
			return TRUE;
		}

		return FALSE;
	}

	/**
	 * @param SplFileInfo $file
	 * @param ReflectionMethod $method
	 * @return string
	 */
	public static function getMethodContents( SplFileInfo $file, ReflectionMethod $method )
	{
		$start_line = $method->getStartLine() - 1;
		$end_line = $method->getEndLine();

		$source = file( $file->getPathName() );
		$source = implode( '' , array_slice( $source, 0, count( $source ) ) );
		$source = preg_split( "/" . PHP_EOL . "/", $source );

		$code = '';
		for( $i = $start_line; $i < $end_line; $i++ )
		{
			$code .= $source[$i] . "\n";
		}

		return $code;
	}

	/**
	 * Format and print the results
	 */
	public static function output()
	{
		@header("Content-type: text/html");

		$methodsPassed = 0;
		$methodsFailed = 0;
		$html = array();
		foreach( static::$output as $class => $data )
		{
			$html[] = "<div class='classbox'><h3>{$class}</h3>";


			foreach( $data as $method => $comment )
			{
				if ( $method == '__error__' )
				{
					$html[] = "<div class='error'>{$comment}</div>";
				}
				else
				{
					if ( mb_stristr( $comment, 'CSRF Checked' ) )
					{
						$cssClass = 'manual';
						$methodsPassed++;
					}
					else
					{
						$cssClass = ( mb_substr( $comment, 0, 1 ) == '+' ) ? 'passed' : 'failed';

						if ( $cssClass == 'failed' )
						{
							$methodsFailed++;
						}
						else
						{
							$methodsPassed++;
						}
					}

					$comment = mb_substr( $comment, 1 );
					$icon = $cssClass == 'failed' ? 'times' : 'check';
					$html[] = "<div class='methodRow {$cssClass}'><span class='methodName'><i class='icon fa-solid fa-{$icon}'></i> {$method}</span><span class='methodComment'>{$comment}</span></div>";
				}
			}

			$html[] = "</div>";
		}

		$options = '<option value="_all_">All Apps</option>';
		foreach( static::$apps as $app )
		{
			$selected = ( isset( $_REQUEST['app'] ) and $_REQUEST['app'] == $app ) ? 'selected="selected"' : '';
			$options .= "<option value='{$app}' {$selected}>" . ucfirst( $app ) . "</option>";
		}

		$htmlToPrint = implode( "\n", $html );

		print <<<EOF
<html>
	<head>
		<title>CSRF Check</title>
		<link href="https://stackpath.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet" integrity="sha384-wvfXpqpZZVQGK6TAh5PVlGOfQNHSoD2xbE+QkPxCAFlNEevoEH3Sl0sibVcOQVnN" crossorigin="anonymous">
		<style type="text/css">
		* {
			font-family: "proxima-nova", "helvetica neue", helvetica, arial, sans-serif;
			font-size: 16px;
		}
		
		body {
		margin: 0px;
		padding: 0px;
		}
		
		.classbox {
			padding: 20px;
			border-bottom: 1px solid #333;
		}
			.classbox h3 {
				padding: 0px;
				margin: 0px;
				font-size: 20px;
			}
			
		span.methodName {
			font-family: courier, monospace;
		}
		
		.methodRow {
			margin-top: 10px;
			padding: 10px;
		}
			.methodRow .icon {
				opacity: 0.4;
			}
			.methodRow.passed {
				background-color: #d4ffdd;
			}
			
			.methodRow.failed {
				background-color: #fce8eb;
			}
			
			.methodRow.manual {
				background-color: #fcf4e8;
			}
		.results {
			font-size: 20px;
			text-align: center;
			background-color: lightgoldenrodyellow;
			padding: 20px;
		}
		.methodName {
			width: 300px;
			display: inline-block;
		}
		.selectApp {
			background-color: #000;
			text-align: center;
			padding: 20px;		
		}
			
		</style>
	</head>
	<body>
		<div class="selectApp">
			<form action="csrfCheck.php">
				<select name="app">
				{$options}
				</select>
				<input type="submit" value="Update">
			</form>
		</div>
		<div class="results">{$methodsPassed} passed and {$methodsFailed} failed</div>
		{$htmlToPrint}
	</body>
</html>
EOF;
		exit();
	}
}
