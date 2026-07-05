import { redirect } from "next/navigation";

export default function OutPage() {
  redirect("/orders/new");
}
