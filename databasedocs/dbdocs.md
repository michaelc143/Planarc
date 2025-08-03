# Using the db

## Accessing the db

```bash
docker exec -it db mysql -u root -p
```

Then enter the password given in the docker compose and run `use chat_app;` to use the correct db.

## Accessing a table schema

```bash
describe tableName;
```
