async function run() {
  try {
    const res = await fetch("https://firestore.googleapis.com/v1/projects/savr-f5076/databases/(default)/documents:listCollectionIds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });
    const data = await res.json();
    console.log("Collections:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}
run();
