<?php

ini_set( 'display_errors', true );
error_reporting( E_ALL );
set_time_limit( 0 );

// Load framework
require_once( '../init.php' );
\IPS\Dispatcher\External::i();

function getTraitMethods( $traitName )
{
	$reflection = new ReflectionClass( $traitName );
	$methods = $reflection->getMethods( ReflectionMethod::IS_PUBLIC );

	$methodSignatures = [];
	foreach ( $methods as $method )
	{
		$methodName = $method->getName();
		if ( substr( $methodName, 0, 2 ) == '__' )
		{
			continue;
		}

		$parameters = $method->getParameters();
		$parameterList = [];
		foreach ( $parameters as $parameter )
		{
			$parameterName = '$' . $parameter->getName();
			if ( $parameter->isOptional() )
			{
				$defaultValue = $parameter->getDefaultValue();
				if ( is_string( $defaultValue ) )
				{
					$defaultValue = "'" . $defaultValue . "'";
				}
				elseif ( is_numeric( $defaultValue ) )
				{
					$defaultValue = $defaultValue;
				}
				elseif ( is_array( $defaultValue ) )
				{
					$defaultValue = '[]';
				}
				elseif ( $defaultValue === null )
				{
					$defaultValue = 'null';
				}
				elseif ( is_bool( $defaultValue ) )
				{
					$defaultValue = $defaultValue ? 'true' : 'false';
				}
				$parameterName .= ' = ' . $defaultValue;
			}
			$parameterList[] = $parameterName;
		}
		$methodSignature = $methodName . '(' . implode( ', ', $parameterList ) . ')';

		$returnType = '';
		if ( $method->hasReturnType() )
		{
			$returnType = (string) $method->getReturnType();

			if ( preg_match( '#(\s|^|\|)(ArrayIterator|Iterator)#', $returnType ) )
			{
				$returnType = preg_replace( '#(ArrayIterator|Iterator)#', '\\\$1', $returnType );
			}

			if ( substr( $returnType, 0, 1 ) == '?' )
			{
				$returnType = substr( $returnType, 1 ) . '|null';
			}

			if ( substr( $returnType, 0, 3 ) == 'IPS' )
			{
				$returnType = '\\' . $returnType;
			}
		}
		$methodSignatures[$methodName] = [ 'sig' => $methodSignature, 'isStatic' => $method->isStatic(), 'returnType' => $returnType ];
	}
	
	ksort( $methodSignatures );
	
	return $methodSignatures;
}

function generateMethodTags( $traitName )
{
	$methodSignatures = getTraitMethods( $traitName );
	$methodTags = [];
	
	$methodTags[] = " *\n * Trait: " . $traitName . " " . str_repeat( '-', 50 - strlen( $traitName ) ) . "\n *";
	foreach ( $methodSignatures as $methodName => $methodSignature )
	{
		$static = $methodSignature['isStatic'] ? ' static' : '';
		$returnType = $methodSignature['returnType'] ? ' ' . $methodSignature['returnType'] : '';
		$methodTags[] = sprintf( " * @method{$static}{$returnType} %s", $methodSignature['sig'] );
	}

	return $methodTags;
}

header( "Content-type:text/plain" );
$traitNames = ['\IPS\Content\ClubContainer', 'IPS\Node\Statistics'];

foreach ( $traitNames as $name )
{
	$methodTags = generateMethodTags( $name );
	echo implode( "\n", $methodTags );
	echo "\n";
}

exit();
