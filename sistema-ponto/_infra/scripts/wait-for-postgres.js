import { exec } from "node:child_process";

function checkPostgres() {
  exec(
    "docker exec sistema-ponto-database pg_isready --host localhost",
    handleReturn,
  );

  function handleReturn(error, stdout) {
    if (stdout.search("accepting connections") === -1) {
      process.stdout.write(".");
      checkPostgres();
      return;
    }

    console.log("\n\n Postgres está pronto e aceitando conexoes");
  }
}

process.stdout.write("\n\n Aguardando postgres aceitar conexoes");

checkPostgres();
