// app/login/page.tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", display: "flex", flexDirection: "column", gap: 16 }}>
      <h1>Log in</h1>

      <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
        Continue with Google
      </button>

      <hr />

      <form onSubmit={handleCredentialsLogin} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}
        <button type="submit">Log in</button>
      </form>

      <p style={{ fontSize: 13 }}>
        No account? <a href="/signup">Sign up</a>
      </p>
    </div>
  );
}