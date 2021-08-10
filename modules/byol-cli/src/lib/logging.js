function logHttpRouteRegistration(debug, verb, route, func) {
    const unescapeRoute = route.split('/\\').join('/');
    let log = `Registered HTTP route: ${verb} at '${unescapeRoute}'`;
    if (func) {
        log += ` calls ${func}`;
    }
    debug(log);
}

function logError(debug, error, route) {
    let log = 'Error %O';
    if (route) {
        log = `Error @ ${route}, %0`;
    }
    debug(log, error);
}

module.exports = {
    logHttpRouteRegistration,
    logError,
};
