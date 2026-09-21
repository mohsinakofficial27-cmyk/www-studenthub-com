import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";

import { read } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  // Session lives in browser storage, so the gate must run on the client only.
  ssr: false,
  beforeLoad: ({ location }) => {
    if (!read().session_user_id) {
      throw redirect({ to: "/login", search: { redirect: location.pathname } });
    }
  },
  component: () => <Outlet />,
});
