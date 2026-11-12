import Link from "next/link";
import { desc } from "drizzle-orm";
import { requireRole } from "@/lib/permissions";
import { getDb } from "@/lib/db";
import { staff } from "@/lib/db/schema";
import { roleLabel } from "@/components/shell/nav";
import { CreateStaffForm } from "./CreateStaffForm";
import { setStaffActive, changeStaffRole } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff — Kazo Technical School" };

export default async function StaffPage() {
  const me = await requireRole("admin");
  const people = await getDb()
    .select()
    .from(staff)
    .orderBy(desc(staff.isActive), desc(staff.createdAt));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Staff</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Deactivated staff keep their record but can&apos;t sign in.
          </p>
        </div>
        <Link
          href="/admin/export/staff"
          className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 py-1.5 text-xs font-medium hover:bg-[color:var(--color-surface-muted)]"
        >
          Export CSV
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create form */}
        <section className="lg:col-span-1">
          <div className="card">
            <h2 className="mb-4 text-sm font-semibold text-neutral-900">
              Add a staff account
            </h2>
            <CreateStaffForm />
          </div>
        </section>

        {/* List */}
        <section className="space-y-3 lg:col-span-2">
          {people.length === 0 && (
            <div className="card text-sm text-neutral-500">
              No staff yet. Add the first account on the left.
            </div>
          )}

          {people.map((person) => {
            const isSelf = person.id === me.id;
            return (
              <div key={person.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-neutral-900">
                        {person.fullName}
                      </span>
                      {isSelf && (
                        <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand">
                          You
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-neutral-500">
                      {person.email}
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      person.isActive
                        ? "bg-green-50 text-green-700"
                        : "bg-neutral-100 text-neutral-500"
                    }`}
                  >
                    {person.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap items-end gap-3">
                  {/* Role */}
                  <form
                    action={changeStaffRole}
                    className="flex items-end gap-2"
                  >
                    <input type="hidden" name="id" value={person.id} />
                    <div>
                      <label
                        htmlFor={`role-${person.id}`}
                        className="field-label"
                      >
                        Role
                      </label>
                      <select
                        id={`role-${person.id}`}
                        name="role"
                        defaultValue={person.role}
                        disabled={isSelf}
                        className="field-input py-2 disabled:opacity-60"
                      >
                        <option value="admin">{roleLabel.admin}</option>
                        <option value="teacher">{roleLabel.teacher}</option>
                        <option value="store_keeper">
                          {roleLabel.store_keeper}
                        </option>
                      </select>
                    </div>
                    <button
                      type="submit"
                      className="btn-secondary py-2"
                      disabled={isSelf}
                    >
                      Save role
                    </button>
                  </form>

                  {/* Activate / deactivate */}
                  <form action={setStaffActive} className="ml-auto">
                    <input type="hidden" name="id" value={person.id} />
                    <input
                      type="hidden"
                      name="active"
                      value={person.isActive ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      disabled={isSelf && person.isActive}
                      className={
                        person.isActive
                          ? "btn-secondary py-2 disabled:opacity-60"
                          : "btn-primary py-2"
                      }
                      title={
                        isSelf && person.isActive
                          ? "You cannot deactivate your own account"
                          : undefined
                      }
                    >
                      {person.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </div>
  );
}
