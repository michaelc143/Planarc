# How to use the API

## Running the API

This api is a flask server and needs the MySQL database to be running in order to use the methods that pull and push data to the db.\
The db is run through the docker compose command so if running through `docker compose up -d --build` all methods should be accessible.\
To run the api locally, run `python3 api.py` in order to run the flask api locally instead of in a container.

## Linting the API

```bash
pylint **/*.py --rcfile=.pylintrc
```
