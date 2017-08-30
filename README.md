# Feedhenry Sync Server

It uses [Feedhenry Sync](https://github.com/feedhenry/fh-sync) as underlying synchronization server.

## Running locally

1. See [Feedhenry Sync](https://github.com/feedhenry/fh-sync) documentation for required MongoDB and Redis setup.
2. `npm install`
3. `npm start`

To change the port edit the value in `package.json`.

## Running on Openshift 3

1. Use the `fh-sync-server-DEVELOPMENT.yaml` template to create an Openshift project with running sync service.

## Verification sync server is up and running

1. "OK" response should be received upon `GET` request (default URL is `http://localhost:3000/`). If running on Openshift use the route created in your project.
2. Navigate to `/dashboard.html` and `/sys/info/stats` to see some statistics about synchronization.

## Cordova client template

The [Feedhenry Cordova Sync Template](https://github.com/feedhenry-templates/feedhenry-cordova-sync-app) can be used to create client application talking to the sync server.
