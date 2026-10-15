<?php


namespace IPS\mafiamanager\modules\front\games;

use IPS\Dispatcher\Controller;
use function defined;

/* To prevent PHP errors (extending class does not exist) revealing path */
if ( !defined( '\IPS\SUITE_UNIQUE_KEY' ) )
{
	header( ( $_SERVER['SERVER_PROTOCOL'] ?? 'HTTP/1.0' ) . ' 403 Forbidden' );
	exit;
}

/**
 * index
 */
class index extends Controller
{
	/**
	 * Execute
	 *
	 * @return	void
	 */
	public function execute() : void
	{
		
		parent::execute();
	}

	/**
	 * ...
	 *
	 * @return	void
	 */
protected function manage() : void
{
    \IPS\Output::i()->title = 'Mafia Manager';

    \IPS\Output::i()->output = '
        <div style="padding: 30px;">
            <h1>Welcome to Mafia Manager!</h1>
            <p>Our first Invision Community 5 application is working.</p>

            <h2>Planned features</h2>
            <ul>
                <li>Manage Mafia games</li>
                <li>Nominate players</li>
                <li>Vote for players</li>
                <li>Track voting results</li>
            </ul>
        </div>
    ';
}
	
	protected function roster(): void
{
    \IPS\Output::i()->error(
        'Списъкът с играчи се задава само при създаване на темата.',
        '2SMM/3',
        403
    );
}


}