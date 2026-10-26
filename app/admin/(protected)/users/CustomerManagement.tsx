"use client";

import { FormEvent, useEffect, useState } from "react";

type Customer = {
  id: string;
  full_name: string;
  email: string;
  account_status: "active" | "disabled";
  created_at: string;
};

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams();
    if (submittedSearch) params.set("search", submittedSearch);
    fetch(`/api/admin/users?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { customers?: Customer[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Unable to load customers.");
        if (active) setCustomers(result.customers ?? []);
      })
      .catch((error: unknown) => {
        if (active) {
          setCustomers([]);
          setMessage(error instanceof Error ? error.message : "Unable to load customers.");
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshIndex, submittedSearch]);

  const refresh = () => {
    setLoading(true);
    setRefreshIndex((index) => index + 1);
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSubmittedSearch(search.trim());
  };

  const inviteCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setBusyId("invite");
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.get("full_name"), email: form.get("email") }),
      });
      const result = await response.json() as { message?: string; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Customer invitation could not be sent.");
      formElement.reset();
      setMessage(result.message ?? "Customer invitation sent.");
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Customer invitation could not be sent.");
    } finally {
      setBusyId("");
    }
  };

  const saveCustomer = async (customer: Customer) => {
    setBusyId(customer.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customer.id, full_name: drafts[customer.id] ?? customer.full_name }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Customer could not be updated.");
      setMessage(`${customer.full_name}'s details were updated.`);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Customer could not be updated.");
    } finally {
      setBusyId("");
    }
  };

  const setCustomerStatus = async (customer: Customer, status: Customer["account_status"]) => {
    const action = status === "disabled" ? "disable" : "restore";
    const pastTense = status === "disabled" ? "disabled" : "restored";
    if (!window.confirm(`Are you sure you want to ${action} ${customer.full_name}'s account?`)) return;
    setBusyId(customer.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: status === "disabled" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(status === "disabled" ? { id: customer.id } : { id: customer.id, account_status: status }),
      });
      const result = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(result.error ?? `Customer account could not be ${pastTense}.`);
      setMessage(result.message ?? `Customer account ${pastTense}.`);
      refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Customer account could not be ${pastTense}.`);
    } finally {
      setBusyId("");
    }
  };

  return <section className="mt-7">
    <form onSubmit={inviteCustomer} className="border border-black/10 bg-white p-5 sm:p-6">
      <h2 className="text-sm uppercase tracking-[0.18em]">Invite a customer</h2>
      <p className="mt-2 text-sm text-black/55">An account invitation will be sent to the customer’s email address.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input name="full_name" required minLength={2} maxLength={120} placeholder="Customer name" aria-label="Customer name" className="border border-black/10 px-4 py-3 text-sm" />
        <input name="email" type="email" required maxLength={254} placeholder="Email address" aria-label="Customer email address" className="border border-black/10 px-4 py-3 text-sm" />
        <button disabled={busyId === "invite"} className="bg-black px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white disabled:opacity-50">{busyId === "invite" ? "Sending…" : "Send invitation"}</button>
      </div>
    </form>

    <form onSubmit={submitSearch} className="mt-5 flex flex-col gap-3 sm:flex-row">
      <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers by name or email" aria-label="Search customers" className="min-w-0 flex-1 border border-black/10 bg-white px-4 py-3 text-sm" />
      <button className="bg-black px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-white">Search</button>
    </form>
    {message && <p role="status" className="mt-4 border border-black/10 bg-white p-3 text-sm">{message}</p>}
    {loading ? <p className="mt-6 border border-black/10 bg-white p-8 text-sm text-black/60">Loading customers…</p> : <div className="mt-6 overflow-x-auto border border-black/10 bg-white">
      <table className="w-full min-w-[850px] text-left text-sm">
        <thead className="border-b border-black/10 text-[10px] uppercase tracking-[0.18em] text-black/50"><tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Status</th><th className="p-4">Registered</th><th className="p-4">Actions</th></tr></thead>
        <tbody>{customers.map((customer) => <tr key={customer.id} className="border-b border-black/10 last:border-0">
          <td className="p-4"><input value={drafts[customer.id] ?? customer.full_name} onChange={(event) => setDrafts((current) => ({ ...current, [customer.id]: event.target.value }))} maxLength={120} aria-label={`Name for ${customer.email}`} className="w-full border border-black/10 px-3 py-2" /></td>
          <td className="p-4">{customer.email}</td>
          <td className="p-4 uppercase text-black/60">{customer.account_status}</td>
          <td className="p-4 text-black/60">{new Date(customer.created_at).toLocaleDateString()}</td>
          <td className="p-4"><div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void saveCustomer(customer)} disabled={busyId === customer.id} className="border border-black/15 px-3 py-2 text-xs disabled:opacity-50">Save</button>
            <button type="button" onClick={() => void setCustomerStatus(customer, customer.account_status === "active" ? "disabled" : "active")} disabled={busyId === customer.id} className="border border-black/15 px-3 py-2 text-xs disabled:opacity-50">{customer.account_status === "active" ? "Disable account" : "Restore account"}</button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {!customers.length && <p className="p-5 text-sm text-black/55">{message ? "Customers could not be loaded." : "No customer accounts found."}</p>}
    </div>}
  </section>;
}
