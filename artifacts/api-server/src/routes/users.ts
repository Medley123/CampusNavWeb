import { Router } from "express";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "../lib/firebase.js";
import { requireAdmin } from "../middlewares/admin-auth.js";

const router = Router();
const COL = "users";

router.post("/users", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const username = typeof req.body?.username === "string" ? req.body.username.trim() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const picture = typeof req.body?.picture === "string" ? req.body.picture : undefined;

  if (!email.endsWith("@gmail.com") || !username || !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    res.status(400).json({ error: "A valid Gmail address and username are required." });
    return;
  }

  try {
    const ref = db.collection(COL).doc(encodeURIComponent(email));
    await ref.set(
      {
        email,
        username,
        name: name || username,
        ...(picture ? { picture } : {}),
        lastLoginAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    res.status(200).json({ id: ref.id, email, username, name: name || username, picture });
  } catch (err) {
    req.log.error({ err }, "Failed to save user");
    res.status(500).json({ error: "Failed to save user profile." });
  }
});

router.get("/users", requireAdmin, async (req, res) => {
  try {
    const snap = await db.collection(COL).orderBy("lastLoginAt", "desc").get();
    res.json(snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        email: data["email"] as string,
        username: data["username"] as string,
        name: data["name"] as string,
        picture: data["picture"] as string | undefined,
        lastLoginAt: data["lastLoginAt"]?.toDate?.()?.toISOString() ?? null,
      };
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to list users");
    res.status(500).json({ error: "Failed to fetch users." });
  }
});

export default router;
