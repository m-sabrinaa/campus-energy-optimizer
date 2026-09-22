import OptimizerForm from "./components/OptimizerForm"

function App() {
  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1
          className="mb-8 text-3xl font-bold"
          style={{ color: "black" }}
        >
          Campus Energy Optimizer
        </h1>

        <OptimizerForm />
      </div>
    </main>
  )
}

export default App