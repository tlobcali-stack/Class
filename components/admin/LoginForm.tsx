"use client";

import { useActionState } from "react";
import { sendLoginLink, type Result } from "@/app/admin/actions";

export default function LoginForm() {
  const [state, action, pending] = useActionState<Result | null, FormData>(sendLoginLink, null);
  return (
    <form action={action} className="mt-6 space-y-4">
      <div>
        <label htmlFor="email" className="field-label">Email</label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <button type="submit" className="btn btn-primary w-full" disabled={pending}>{pending ? "Sending…" : "Email me a sign-in link"}</button>
      {state && (
        <p role="status" className={`rounded-xl p-3 font-bold ${state.ok ? "bg-white text-plum" : "border-2 border-magenta bg-white text-magenta"}`}>
          {state.ok ? state.message : state.error}
        </p>
      )}
    </form>
  );
}
