const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY!;
const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";

export async function runTinyfishAgent(url: string, goal: string) {
  const response = await fetch(`${TINYFISH_BASE}/automation/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": TINYFISH_API_KEY,
    },
    body: JSON.stringify({
      url,
      goal,
      browser_profile: "lite",
    }),
  });

  if (!response.ok) {
    throw new Error(`TinyFish error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

// Run multiple agents in parallel
export async function runParallelAgents(
  tasks: { url: string; goal: string }[]
) {
  return Promise.allSettled(
    tasks.map((task) => runTinyfishAgent(task.url, task.goal))
  );
}
