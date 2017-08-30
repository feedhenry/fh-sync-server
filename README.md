# FeedHenry Sync Server Demo

***Note: This is not intended to be used as a template in RHMAP 3.x or 4.x***

A demo server for use with a sync client. Keycloak can also be configured for
auth.

## Run the server locally
To run the server, ensure that a local MongoDB and Redis instance are available.
These can be created using `./scripts/start_services.sh`. The server will run on
port `3000` by default, to change this include the `SERVER_PORT` variable.

```
SERVER_PORT=8001 node app.js
```

## Enable Keycloak
To enable Keycloak you need to populate the `keycloak.json` file in the base of
this repo. The existing file can be used with the sample realm and clients
created by `keycloak/sample-realm.json` and users created by `sample-users.json`

To run a Keycloak container run:

`docker run -e KEYCLOAK_USER=admin -e KEYCLOAK_PASSWORD=admin -p 8080:8080 jboss/keycloak`

Once the server is running a Realm and Users must be created. Go to the
Keycloak admin console `http://127.0.0.1:8080` and login.

Hover over the current Realm `Master` and click `Create Realm`. Select to
import from a file and use `keycloak/example-realm.json` in this repo.

While in the new `myShoppingList` Realm. Go to the `import` tab and select to
import from file, select `keycloak/example-users.json` in this repo.

Enable all import options, e.g. `Import groups` and select `Import`.

Once Keycloak is configured, run the server with `SYNC_ENABLE_AUTH` defined.

```
SERVER_PORT=8001 SYNC_ENABLE_AUTH=true node app.js
```


