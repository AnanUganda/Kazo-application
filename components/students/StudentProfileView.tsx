import Link from "next/link";
import type { ApplicationStage, PaymentMethod } from "@/lib/db/schema";
import type { StudentProfileData } from "@/lib/students-data";
import { formatDate, formatUGX, todayKampala } from "@/lib/format";
import {
  BillFeeItemForm,
  EditStudentDetailsForm,
  RecordPaymentForm,
  ReversePaymentForm,
  StudentStatusControl,
} from "@/app/(app)/admin/students/StudentAdminControls";
import { AttendanceBadge, StudentStatusBadge } from "./StudentListView";

const STAGE_LABEL: Record<ApplicationStage, string> = {
  applied_unpaid: "Applied (unpaid)",
  registered: "Registered",
  test_interview: "Test & interview",
  enrolled: "Enrolled",
  not_accepted: "Not accepted",
  withdrew: "Withdrew",
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
  mtn: "MTN",
  airtel: "Airtel",
  cash: "Cash",
};

const semesterLabel = (n: number | null) =>
  n === 1 ? "Semester 1" : n === 2 ? "Semester 2" : "Any time";

export function StudentProfileView({
  data,
  basePath,
  showFees,
  isAdmin,
}: {
  data: StudentProfileData;
  basePath: "/admin/students" | "/teacher/students";
  showFees: boolean;
  isAdmin: boolean;
}) {
  const {
    student,
    intake,
    threshold,
    attendance,
    absences,
    application,
    assignedEquipment,
    fees,
  } = data;
  const canEdit = isAdmin && intake.status === "active";
  const today = todayKampala();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={basePath}
          className="text-xs font-semibold text-brand hover:underline"
        >
          ← Back to students
        </Link>
      </div>

      {/* Header */}
      <header className="card flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold text-neutral-900">
              {student.fullName}
            </h1>
            <StudentStatusBadge status={student.status} />
          </div>
          <p className="text-sm text-neutral-500">
            {intake.name} · Enrolled {formatDate(student.createdAt)} ·{" "}
            {student.booth ? (
              <span className="font-medium text-neutral-700">
                {student.booth}
              </span>
            ) : (
              <span>No booth assigned</span>
            )}
          </p>
        </div>

        {canEdit && (
          <StudentStatusControl
            studentId={student.id}
            currentStatus={student.status}
          />
        )}
      </header>

      {intake.status === "archived" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
          This intake is archived. Student records, fees, and attendance are
          read-only.
        </div>
      )}

      {/* Contact, Next of Kin, Booth & Machine */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-neutral-900">
              Contact details &amp; next of kin
            </h2>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-neutral-500">Phone</dt>
              <dd className="font-medium text-neutral-900">{student.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Email</dt>
              <dd className="font-medium text-neutral-900">
                {student.email || <span className="text-neutral-500">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Date of birth</dt>
              <dd className="font-medium text-neutral-900">
                {student.dob ? (
                  formatDate(student.dob)
                ) : (
                  <span className="text-neutral-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Location / residence</dt>
              <dd className="font-medium text-neutral-900">
                {student.location || (
                  <span className="text-neutral-500">—</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="border-t border-neutral-100 pt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Next of kin
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-neutral-500">Full name</dt>
                <dd className="font-medium text-neutral-900">
                  {student.nextOfKinName || (
                    <span className="text-neutral-500">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Phone</dt>
                <dd className="font-medium text-neutral-900">
                  {student.nextOfKinPhone || (
                    <span className="text-neutral-500">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-neutral-500">Relationship</dt>
                <dd className="font-medium text-neutral-900">
                  {student.nextOfKinRelationship || (
                    <span className="text-neutral-500">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {canEdit && <EditStudentDetailsForm student={student} />}
        </section>

        <section className="card space-y-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Workshop assignment
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-neutral-500">Assigned booth</dt>
              <dd className="mt-0.5 text-base font-semibold text-neutral-900">
                {student.booth || (
                  <span className="text-sm font-normal text-neutral-500">
                    Unassigned
                  </span>
                )}
              </dd>
            </div>
            <div className="border-t border-neutral-100 pt-3">
              <dt className="text-xs text-neutral-500">Assigned machine</dt>
              {assignedEquipment.length === 0 ? (
                <dd className="mt-1 text-xs text-neutral-500">
                  No machine assigned yet.
                  {isAdmin && (
                    <Link
                      href="/admin/equipment"
                      className="ml-1 font-semibold text-brand hover:underline"
                    >
                      Assign in Equipment →
                    </Link>
                  )}
                </dd>
              ) : (
                <dd className="mt-1.5 space-y-2">
                  {assignedEquipment.map((eqItem) => {
                    const statusBadge =
                      eqItem.status === "working" ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          Working
                        </span>
                      ) : eqItem.status === "needs_repair" ? (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                          Needs repair
                        </span>
                      ) : (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                          Out of service
                        </span>
                      );
                    return (
                      <div
                        key={eqItem.id}
                        className="rounded-xl border border-neutral-200 bg-neutral-50 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-neutral-900">
                            {eqItem.assetCode}
                          </span>
                          {statusBadge}
                        </div>
                        <div className="mt-0.5 text-neutral-600">
                          {eqItem.type}
                          {eqItem.makeModel ? ` · ${eqItem.makeModel}` : ""}
                        </div>
                      </div>
                    );
                  })}
                  {isAdmin && (
                    <Link
                      href="/admin/equipment"
                      className="inline-block text-xs font-semibold text-brand hover:underline"
                    >
                      Manage in Equipment →
                    </Link>
                  )}
                </dd>
              )}
            </div>
          </dl>
        </section>
      </div>

      {/* Attendance */}
      <section className="card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">
              Attendance
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Derived from lesson absences since enrolment · threshold{" "}
              {threshold}%
            </p>
          </div>
          <AttendanceBadge
            rate={attendance.rate}
            belowThreshold={attendance.belowThreshold}
            threshold={threshold}
          />
        </div>

        {attendance.belowThreshold && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-800"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
            Red flag: attendance is {attendance.rate}%, below the {threshold}%
            school threshold ({attendance.presentCount} of{" "}
            {attendance.sessionsHeld} sessions attended).
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Sessions held</div>
            <div className="mt-0.5 text-lg font-bold text-neutral-900">
              {attendance.sessionsHeld}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Present</div>
            <div className="mt-0.5 text-lg font-bold text-emerald-700">
              {attendance.presentCount}
            </div>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <div className="text-xs text-neutral-500">Absences</div>
            <div className="mt-0.5 text-lg font-bold text-neutral-900">
              {attendance.absencesCount}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Absences by date ({absences.length})
          </h3>
          {absences.length === 0 ? (
            <p className="text-sm text-neutral-500">
              No absences recorded since enrolment.
            </p>
          ) : (
            <div className="space-y-2">
              {absences.map((a) => (
                <div
                  key={a.lessonLogId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-100 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-neutral-900">
                      {formatDate(a.date)}
                    </span>
                    <span className="ml-2 text-xs capitalize text-neutral-500">
                      {a.session} session
                    </span>
                    {a.notes && (
                      <span className="ml-2 text-xs text-neutral-500">
                        · {a.notes}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-neutral-500">
                    Logged by {a.teacherName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Fees — strictly Admin only; never rendered for Teacher */}
      {showFees && fees !== null && (
        <section className="card space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Fee ledger
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                Balances are always derived from the append-only payment log.
                Payments cannot be edited or deleted — mistakes are corrected
                with a reversal entry.
              </p>
            </div>
          </div>

          {/* Totals bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
              <div className="text-xs text-neutral-500">Total billed</div>
              <div className="mt-1 text-base font-bold text-neutral-900">
                {formatUGX(fees.totals.totalDue)}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
              <div className="text-xs text-neutral-500">
                Total paid (net of reversals)
              </div>
              <div className="mt-1 text-base font-bold text-emerald-700">
                {formatUGX(fees.totals.paid)}
              </div>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3.5">
              <div className="text-xs text-neutral-500">Total balance due</div>
              <div className="mt-1 text-base font-bold text-brand">
                {formatUGX(fees.totals.balance)}
              </div>
            </div>
          </div>

          {/* One line per fee item */}
          <div className="space-y-4">
            {fees.lines.map((line) => {
              const statusBadge = !line.billed ? (
                <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-500">
                  Not billed yet
                </span>
              ) : line.balance <= 0 ? (
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  Paid
                </span>
              ) : line.paid > 0 ? (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Partial
                </span>
              ) : (
                <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                  Unpaid
                </span>
              );

              return (
                <div
                  key={line.code}
                  className="rounded-xl border border-neutral-200 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-neutral-900">
                          {line.name}
                        </h3>
                        {statusBadge}
                      </div>
                      <div className="mt-0.5 text-xs text-neutral-500">
                        {semesterLabel(line.appliesToSemester)} · Standard fee{" "}
                        {formatUGX(line.defaultAmount)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <div className="text-xs text-neutral-500">
                          Amount due
                        </div>
                        <div className="font-semibold text-neutral-800">
                          {line.billed
                            ? formatUGX(line.amountDue)
                            : formatUGX(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">Paid</div>
                        <div className="font-semibold text-emerald-700">
                          {formatUGX(line.paid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-neutral-500">Balance</div>
                        <div className="font-bold text-neutral-900">
                          {line.billed ? formatUGX(line.balance) : formatUGX(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ledger entries for this fee item */}
                  {line.payments.length > 0 && (
                    <div className="space-y-2 border-t border-neutral-100 pt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                        Payment &amp; reversal history ({line.payments.length})
                      </div>
                      {line.payments.map((p) => {
                        const isReversal = p.entryType === "reversal";
                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border px-3 py-2.5 text-xs ${
                              isReversal
                                ? "border-red-100 bg-red-50/50 text-red-900"
                                : p.isReversed
                                  ? "border-neutral-200 bg-neutral-50 text-neutral-500"
                                  : "border-neutral-100 bg-white text-neutral-800"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold">
                                {isReversal ? "Reversal · −" : "Payment · +"}
                                {formatUGX(p.amount)}{" "}
                                <span className="font-normal text-neutral-500">
                                  ({METHOD_LABEL[p.method]}
                                  {p.reference ? ` · Ref: ${p.reference}` : ""})
                                </span>
                                {p.isReversed && !isReversal && (
                                  <span className="ml-2 rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-neutral-600">
                                    Reversed
                                  </span>
                                )}
                              </div>
                              <div className="text-neutral-500">
                                {formatDate(p.paidAt)}
                                {p.confirmedBy
                                  ? ` · Confirmed by ${p.confirmedBy}`
                                  : ""}
                                {p.recordedByName
                                  ? ` · Logged by ${p.recordedByName}`
                                  : ""}
                              </div>
                            </div>
                            {isReversal && p.reason && (
                              <div className="mt-1 text-red-700">
                                Reason: {p.reason}
                              </div>
                            )}
                            {canEdit && !isReversal && !p.isReversed && (
                              <ReversePaymentForm
                                studentId={student.id}
                                paymentId={p.id}
                                amount={p.amount}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Admin actions: Bill item (if not billed) + Record payment */}
                  {canEdit && (
                    <div className="flex flex-wrap items-start justify-between gap-2 border-t border-neutral-100 pt-3">
                      <div className="min-w-0 flex-1">
                        <RecordPaymentForm
                          studentId={student.id}
                          feeTypeCode={line.code}
                          feeName={line.name}
                          suggestedAmount={
                            line.billed
                              ? Math.max(0, line.balance)
                              : line.defaultAmount
                          }
                          defaultDate={today}
                        />
                      </div>
                      {!line.billed && (
                        <BillFeeItemForm
                          studentId={student.id}
                          feeTypeCode={line.code}
                          defaultAmount={line.defaultAmount}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Full Application History */}
      <section className="card space-y-4">
        <h2 className="text-sm font-semibold text-neutral-900">
          Application history
        </h2>
        {!application ? (
          <p className="text-sm text-neutral-500">
            No linked application record (student was added directly).
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-neutral-500">Application stage</dt>
              <dd className="font-medium text-neutral-900">
                {STAGE_LABEL[application.stage]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Applied on</dt>
              <dd className="font-medium text-neutral-900">
                {formatDate(application.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Education level</dt>
              <dd className="font-medium text-neutral-900">
                {application.educationLevel || (
                  <span className="text-neutral-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">
                Prior welding experience
              </dt>
              <dd className="font-medium text-neutral-900">
                {application.priorExperience || (
                  <span className="text-neutral-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Heard about KTS via</dt>
              <dd className="font-medium text-neutral-900">
                {application.heardAbout || (
                  <span className="text-neutral-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">Test &amp; interview</dt>
              <dd className="font-medium text-neutral-900">
                {application.testDate ? (
                  <>
                    {formatDate(application.testDate)}
                    {application.testResult && (
                      <span className="ml-1.5 uppercase text-xs font-semibold text-emerald-700">
                        ({application.testResult})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-neutral-500">—</span>
                )}
              </dd>
            </div>
            {application.interviewNotes && (
              <div className="sm:col-span-3">
                <dt className="text-xs text-neutral-500">Interview notes</dt>
                <dd className="mt-0.5 text-neutral-800">
                  {application.interviewNotes}
                </dd>
              </div>
            )}
          </dl>
        )}
      </section>
    </div>
  );
}
