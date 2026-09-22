const API_URL = "http://localhost:3000"

export const optimizeEnergy = async (data) => {
  const response = await fetch(`${API_URL}/optimize-energy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.message || JSON.stringify(result))
  }

  return result
}