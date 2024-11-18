import {config} from './backend/config';

const setupCheck = new RegExp(/false/i);

if(setupCheck.test(config.setup || "") ) {
    console.log("Setup is not complete, redirecting to setup");
    import('./setup/setup');
} else {
    console.log("Setup is complete");
    import('./website/website');
    import('./bot/bot');
}
