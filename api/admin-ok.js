export const config = { runtime: "nodejs" };

export default function handler(req, res) {
  res.status(200).send("ADMIN_OK");
}
