# Jobly Backend

This is the Express backend for Jobly, version 2.

To run this:

    node server.js
    
To run the tests:

    jest -i

NOTE: When running routes requiring authorization, set an authorization header like so:

- `authorization: bearer [JWTTOKEN]`

Where `[JWTOKEN]` is the JWT token generated via the `/auth/token` route or `/auth/register` route, or the associated create new user route