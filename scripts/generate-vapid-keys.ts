import webpush from "web-push";

const vapidKeys = webpush.generateVAPIDKeys();

console.log("\n========== VAPID KEYS ==========\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log("\n================================\n");
console.log("Füge diese Zeilen zu deiner .env.local Datei hinzu.\n");
