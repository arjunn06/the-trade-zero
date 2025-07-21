// pages/auth/ctrader/callback.tsx

import { useEffect } from "react";
import { useRouter } from "next/router";

export default function CTraderCallback() {
  const router = useRouter();

  useEffect(() => {
    const { code } = router.query;

    if (code) {
      fetch("/api/ctrader/exchange-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
        .then((res) => res.json())
        .then((data) => {
          console.log("Token exchange response:", data);
          router.push("/dashboard"); // or wherever you want to take them after login
        });
    }
  }, [router.query]);

  return <p>Connecting to cTrader...</p>;
}