"use client";

import * as React from "react";
import { SubscriptionGate } from "@/src/components/subscription/SubscriptionGate";

export default function SubscriptionGateWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SubscriptionGate subscribePath="/dashboard/corporate/subscribe">
      {children}
    </SubscriptionGate>
  );
}
