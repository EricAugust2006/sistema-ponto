export default function Home() {


  
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-zinc-900">
      <header className="flex w-full items-center justify-between border-b border-gray-300 bg-gradient-to-b from-zinc-200 p-4 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Controle de Ponto
        </span>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-8 font-sans antialiased">
        <form
          action=""
          className="flex w-full max-w-xs sm:max-w-sm flex-col items-center justify-center gap-4 rounded-xl bg-white px-6 py-6 sm:px-8 shadow-md dark:bg-zinc-800 dark:shadow-none dark:ring-1 dark:ring-zinc-700"
        >
          <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">
            Controle de Ponto
          </h1>

          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="matricula"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                Matrícula:
              </label>
              <input
                type="text"
                id="matricula"
                name="matricula"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-500"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="senha"
                className="text-sm font-semibold text-gray-700 dark:text-gray-200"
              >
                Senha:
              </label>
              <input
                type="password"
                id="senha"
                name="senha"
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-800 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-gray-100 dark:focus:ring-zinc-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-md bg-zinc-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Entrar
          </button>
        </form>
      </main>
    </div>
  );
}