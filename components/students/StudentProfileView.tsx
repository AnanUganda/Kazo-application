import Link from "next/link";
import type { ApplicationStage, PaymentMethod } from "@/lib/db/schema";
import type { StudentProfileData } from "@/lib/students-data";
import { formatDate, formatUGX, sessionLabel, todayKampala } from "@/lib/format";
import {
  BillFeeItemForm,
  EditStudentDetailsForm,
  RecordPaymentForm,
  ReversePaymentForm,
  StudentStatusControl,
} from "@/app/(app)/admin/students/StudentAdminControls";
import { AttendanceBadge, StudentStatusBadge } from "./StudentListView";
import { StatusTag } from "@/components/status-tag";
import { AssessmentForm } from "./AssessmentForm";

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
    practicals,
    fees,
  } = data;
  const passed = practicals.filter((p) => p.attempts[0]?.result === "pass").length;
  const canAssess = intake.status === "active" && student.status === "active";
  const canEdit = isAdmin && intake.status === "active";
  const today = todayKampala();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={basePath}
          className="text-xs font-semibold text-primary hover:underline"
        >
          ← Back to students
        </Link>
      </div>

      {/* Header */}
      <header className="card flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="page-title">
              {student.fullName}
            </h1>
            <StudentStatusBadge status={student.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {intake.name} · Enrolled {formatDate(student.createdAt)} ·{" "}
            {student.booth ? (
              <span className="font-medium text-foreground">
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
        <div className="rounded-xl border px-4 py-3 text-xs font-medium text-amber-700 dark:text-amber-400">
          Archived intake — read-only.
        </div>
      )}

      {/* Contact, Next of Kin, Booth & Machine */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="card space-y-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title">
              Contact details &amp; next of kin
            </h2>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-muted-foreground">Phone</dt>
              <dd className="font-medium text-foreground">{student.phone}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="font-medium text-foreground">
                {student.email || <span className="text-muted-foreground">—</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Date of birth</dt>
              <dd className="font-medium text-foreground">
                {student.dob ? (
                  formatDate(student.dob)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Location / residence</dt>
              <dd className="font-medium text-foreground">
                {student.location || (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
          </dl>

          <div className="border-t border pt-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Next of kin
            </h3>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Full name</dt>
                <dd className="font-medium text-foreground">
                  {student.nextOfKinName || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="font-medium text-foreground">
                  {student.nextOfKinPhone || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Relationship</dt>
                <dd className="font-medium text-foreground">
                  {student.nextOfKinRelationship || (
                    <span className="text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {canEdit && <EditStudentDetailsForm student={student} />}
        </section>

        <section className="card space-y-4">
          <h2 className="section-title">
            Workshop assignment
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Assigned booth</dt>
              <dd className="mt-0.5 text-base font-semibold text-foreground">
                {student.booth || (
                  <span className="text-sm font-normal text-muted-foreground">
                    Unassigned
                  </span>
                )}
              </dd>
            </div>
            <div className="border-t border pt-3">
              <dt className="text-xs text-muted-foreground">Assigned machine</dt>
              {assignedEquipment.length === 0 ? (
                <dd className="mt-1 text-xs text-muted-foreground">
                  No machine assigned yet.
                  {isAdmin && (
                    <Link
                      href="/admin/equipment"
                      className="ml-1 font-semibold text-primary hover:underline"
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
                        <StatusTag tone="success">Working</StatusTag>
                      ) : eqItem.status === "needs_repair" ? (
                        <StatusTag tone="warning">Needs repair</StatusTag>
                      ) : (
                        <StatusTag tone="danger">Out of service</StatusTag>
                      );
                    return (
                      <div
                        key={eqItem.id}
                        className="rounded-xl border border bg-muted/50 p-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-foreground">
                            {eqItem.assetCode}
                          </span>
                          {statusBadge}
                        </div>
                        <div className="mt-0.5 text-muted-foreground">
                          {eqItem.type}
                          {eqItem.makeModel ? ` · ${eqItem.makeModel}` : ""}
                        </div>
                      </div>
                    );
                  })}
                  {isAdmin && (
                    <Link
                      href="/admin/equipment"
                      className="inline-block text-xs font-semibold text-primary hover:underline"
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
            <h2 className="section-title">
              Attendance
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
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
            className="flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold text-red-700 dark:text-red-400"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />
            Red flag: attendance is {attendance.rate}%, below the {threshold}%
            school threshold ({attendance.presentCount} of{" "}
            {attendance.sessionsHeld} sessions attended).
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Sessions held</div>
            <div className="mt-0.5 text-lg font-bold text-foreground">
              {attendance.sessionsHeld}
            </div>
          </div>
          <div className="rounded-xl border border bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Present</div>
            <div className="mt-0.5 text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {attendance.presentCount}
            </div>
          </div>
          <div className="rounded-xl border border bg-muted/50 p-3">
            <div className="text-xs text-muted-foreground">Absences</div>
            <div className="mt-0.5 text-lg font-bold text-foreground">
              {attendance.absencesCount}
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Absences by date ({absences.length})
          </h3>
          {absences.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No absences recorded since enrolment.
            </p>
          ) : (
            <div className="space-y-2">
              {absences.map((a) => (
                <div
                  key={a.lessonLogId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-foreground">
                      {formatDate(a.date)}
                    </span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {sessionLabel(a.session)}
                    </span>
                    {a.notes && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        · {a.notes}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Logged by {a.teacherName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Practical weld assessments */}
      <section className="card space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="section-title">Practical assessments</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Latest weld test result for each practical module
            </p>
          </div>
          <span className="text-sm font-semibold tabular-nums">
            {passed} of {practicals.length} passed
          </span>
        </div>

        {practicals.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This intake has no practical modules in its syllabus yet.
          </p>
        ) : (
          <ul className="divide-y text-sm">
            {practicals.map((p) => {
              const latest = p.attempts[0];
              return (
                <li key={p.topicId} className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{p.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Semester {p.semester}
                        {latest &&
                          ` · ${formatDate(latest.date)}${
                            p.attempts.length > 1
                              ? ` · attempt ${p.attempts.length}`
                              : ""
                          }`}
                      </div>
                    </div>
                    {latest?.score != null && (
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {latest.score}%
                      </span>
                    )}
                    <StatusTag
                      tone={
                        !latest
                          ? "neutral"
                          : latest.result === "pass"
                            ? "success"
                            : "warning"
                      }
                      className="w-24 shrink-0 whitespace-nowrap text-right"
                    >
                      {!latest
                        ? "Not assessed"
                        : latest.result === "pass"
                          ? "Pass"
                          : "Redo"}
                    </StatusTag>
                  </div>
                  {latest?.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {latest.notes}
                      {latest.assessorName ? ` — ${latest.assessorName}` : ""}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {canAssess && practicals.length > 0 && (
          <details className="group rounded-xl border">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
              Record an assessment
              <span className="text-muted-foreground transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <div className="border-t p-4">
              <AssessmentForm
                studentId={student.id}
                today={today}
                modules={practicals.map((p) => ({
                  id: p.topicId,
                  title: p.title,
                  semester: p.semester,
                }))}
              />
            </div>
          </details>
        )}
      </section>

      {/* Fees — strictly Admin only; never rendered for Teacher */}
      {showFees && fees !== null && (
        <section className="card space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="section-title">
                Fee ledger
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Payments can&apos;t be edited. Fix mistakes with a reversal.
              </p>
            </div>
          </div>

          {/* Totals bar */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border bg-muted/50 p-3.5">
              <div className="text-xs text-muted-foreground">Total billed</div>
              <div className="mt-1 text-base font-bold text-foreground">
                {formatUGX(fees.totals.totalDue)}
              </div>
            </div>
            <div className="rounded-xl border border bg-muted/50 p-3.5">
              <div className="text-xs text-muted-foreground">
                Total paid (net of reversals)
              </div>
              <div className="mt-1 text-base font-bold text-emerald-700 dark:text-emerald-400">
                {formatUGX(fees.totals.paid)}
              </div>
            </div>
            <div className="rounded-xl border border bg-muted/50 p-3.5">
              <div className="text-xs text-muted-foreground">Total balance due</div>
              <div className="mt-1 text-base font-bold text-primary">
                {formatUGX(fees.totals.balance)}
              </div>
            </div>
          </div>

          {/* One line per fee item */}
          <div className="space-y-4">
            {fees.lines.map((line) => {
              const statusBadge = !line.billed ? (
                <StatusTag tone="neutral">Not billed yet</StatusTag>
              ) : line.balance <= 0 ? (
                <StatusTag tone="success">Paid</StatusTag>
              ) : line.paid > 0 ? (
                <StatusTag tone="warning">Partial</StatusTag>
              ) : (
                <StatusTag tone="danger">Unpaid</StatusTag>
              );

              return (
                <div
                  key={line.code}
                  className="rounded-xl border border p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-foreground">
                          {line.name}
                        </h3>
                        {statusBadge}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {semesterLabel(line.appliesToSemester)} · Standard fee{" "}
                        {formatUGX(line.defaultAmount)}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Amount due
                        </div>
                        <div className="font-semibold text-foreground">
                          {line.billed
                            ? formatUGX(line.amountDue)
                            : formatUGX(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Paid</div>
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatUGX(line.paid)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Balance</div>
                        <div className="font-bold text-foreground">
                          {line.billed ? formatUGX(line.balance) : formatUGX(0)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ledger entries for this fee item */}
                  {line.payments.length > 0 && (
                    <div className="space-y-2 border-t border pt-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Payment &amp; reversal history ({line.payments.length})
                      </div>
                      {line.payments.map((p) => {
                        const isReversal = p.entryType === "reversal";
                        return (
                          <div
                            key={p.id}
                            className={`rounded-xl border px-3 py-2.5 text-xs ${
                              isReversal
                                ? "text-red-700 dark:text-red-400"
                                : p.isReversed
                                  ? "bg-muted/40 text-muted-foreground"
                                  : "bg-background text-foreground"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-semibold">
                                {isReversal ? "Reversal · −" : "Payment · +"}
                                {formatUGX(p.amount)}{" "}
                                <span className="font-normal text-muted-foreground">
                                  ({METHOD_LABEL[p.method]}
                                  {p.reference ? ` · Ref: ${p.reference}` : ""})
                                </span>
                                {p.isReversed && !isReversal && (
                                  <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                                    Reversed
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground">
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
                              <div className="mt-1 text-red-700 dark:text-red-400">
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
                    <div className="flex flex-wrap items-start justify-between gap-2 border-t border pt-3">
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
        <h2 className="section-title">
          Application history
        </h2>
        {!application ? (
          <p className="text-sm text-muted-foreground">
            No linked application record (student was added directly).
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">Application stage</dt>
              <dd className="font-medium text-foreground">
                {STAGE_LABEL[application.stage]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Applied on</dt>
              <dd className="font-medium text-foreground">
                {formatDate(application.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Education level</dt>
              <dd className="font-medium text-foreground">
                {application.educationLevel || (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                Prior welding experience
              </dt>
              <dd className="font-medium text-foreground">
                {application.priorExperience || (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Heard about KTS via</dt>
              <dd className="font-medium text-foreground">
                {application.heardAbout || (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Test &amp; interview</dt>
              <dd className="font-medium text-foreground">
                {application.testDate ? (
                  <>
                    {formatDate(application.testDate)}
                    {application.testResult && (
                      <span className="ml-1.5 uppercase text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        ({application.testResult})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </dd>
            </div>
            {application.interviewNotes && (
              <div className="sm:col-span-3">
                <dt className="text-xs text-muted-foreground">Interview notes</dt>
                <dd className="mt-0.5 text-foreground">
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
