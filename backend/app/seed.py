"""Seeds realistic demo data: multiple projects, mixed-role users, and tasks
covering every status plus the edge cases the dashboard/health features need
to demonstrate well (overdue, due-this-week, high-priority-overdue, a
completed-but-past-due task, and one project with zero tasks).

Run with: python -m app.seed
Safe to re-run — it wipes and reseeds rather than duplicating rows, so the
demo data always reflects "today" regardless of when it's run.
"""
from datetime import date, timedelta

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.ai import AIAction, AILog, AISuggestion, AISuggestionBatch
from app.models.enums import TaskPriority, TaskStatus, UserRole
from app.models.notification import Notification
from app.models.project import Project, ProjectMember
from app.models.task import Task, TaskDependency
from app.models.user import User

DEMO_PASSWORD = "password123"


def _wipe(db) -> None:
    # Deleted in FK-safe order: AI/notification records reference tasks,
    # projects, and users with RESTRICT (not CASCADE) foreign keys, by
    # design, so a real delete elsewhere in the app can't silently drop
    # audit history — this full-reset script has to clear them explicitly.
    db.query(AILog).delete()
    db.query(AIAction).delete()
    db.query(AISuggestion).delete()
    db.query(AISuggestionBatch).delete()
    db.query(Notification).delete()
    db.query(TaskDependency).delete()
    db.query(Task).delete()
    db.query(ProjectMember).delete()
    db.query(Project).delete()
    db.query(User).delete()
    db.commit()


def seed() -> None:
    db = SessionLocal()
    try:
        _wipe(db)
        today = date.today()

        alice = User(email="alice@demo.com", name="Alice Johnson", role=UserRole.PM, password_hash=hash_password(DEMO_PASSWORD))
        bob = User(email="bob@demo.com", name="Bob Martinez", role=UserRole.PM, password_hash=hash_password(DEMO_PASSWORD))
        carol = User(email="carol@demo.com", name="Carol Chen", role=UserRole.MEMBER, password_hash=hash_password(DEMO_PASSWORD))
        david = User(email="david@demo.com", name="David Kim", role=UserRole.MEMBER, password_hash=hash_password(DEMO_PASSWORD))
        priya = User(email="priya@demo.com", name="Priya Sharma", role=UserRole.MEMBER, password_hash=hash_password(DEMO_PASSWORD))
        db.add_all([alice, bob, carol, david, priya])
        db.flush()

        checkout = Project(
            name="E-Commerce Checkout Revamp",
            description="Rebuild the checkout flow with a new payment provider and improved UX.",
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=30),
            created_by=alice.id,
        )
        portal = Project(
            name="Customer Portal Redesign",
            description="Modernize the self-service customer portal, including accessibility fixes.",
            start_date=today - timedelta(days=20),
            end_date=today + timedelta(days=45),
            created_by=alice.id,
        )
        analytics = Project(
            name="Internal Analytics Dashboard",
            description="Early-stage project to give leadership real-time KPIs. Kickoff pending.",
            start_date=today,
            end_date=today + timedelta(days=60),
            created_by=bob.id,
        )
        db.add_all([checkout, portal, analytics])
        db.flush()

        for project, members in (
            (checkout, [alice, carol, david]),
            (portal, [alice, david, priya]),
            (analytics, [bob, priya, carol]),
        ):
            for member in members:
                db.add(ProjectMember(project_id=project.id, user_id=member.id))
        db.flush()

        def task(project, title, priority, task_status, due_offset, owner, start_offset=-5, desc=""):
            return Task(
                project_id=project.id,
                title=title,
                description=desc or f"{title} for {project.name}.",
                owner_id=owner.id,
                priority=priority,
                status=task_status,
                start_date=today + timedelta(days=start_offset),
                due_date=today + timedelta(days=due_offset),
                created_by=project.created_by,
            )

        payment_api = task(checkout, "Payment API integration", TaskPriority.HIGH, TaskStatus.IN_PROGRESS, -3, carol)
        checkout_ui = task(checkout, "Checkout UI", TaskPriority.MEDIUM, TaskStatus.COMPLETED, -5, david, start_offset=-15)
        checkout_testing = task(checkout, "Checkout Testing", TaskPriority.HIGH, TaskStatus.TODO, 2, carol)
        order_api = task(checkout, "Order API", TaskPriority.HIGH, TaskStatus.TESTING, -1, david)
        refund_flow = task(checkout, "Refund flow", TaskPriority.LOW, TaskStatus.TODO, 10, carol)
        cart_bug = task(checkout, "Cart persistence bug fix", TaskPriority.MEDIUM, TaskStatus.IN_PROGRESS, 4, david)

        profile_redesign = task(portal, "Profile page redesign", TaskPriority.MEDIUM, TaskStatus.COMPLETED, -10, priya, start_offset=-18)
        dark_mode = task(portal, "Dark mode support", TaskPriority.LOW, TaskStatus.IN_PROGRESS, 15, david)
        notif_prefs = task(portal, "Notification preferences UI", TaskPriority.MEDIUM, TaskStatus.TODO, 3, priya)
        accessibility_audit = task(portal, "Accessibility audit", TaskPriority.HIGH, TaskStatus.TODO, -2, alice)
        perf_testing = task(portal, "Portal performance testing", TaskPriority.MEDIUM, TaskStatus.TESTING, 1, priya)

        db.add_all(
            [
                payment_api, checkout_ui, checkout_testing, order_api, refund_flow, cart_bug,
                profile_redesign, dark_mode, notif_prefs, accessibility_audit, perf_testing,
            ]
        )
        db.flush()

        db.add(TaskDependency(task_id=checkout_testing.id, depends_on_task_id=payment_api.id))
        # analytics project intentionally has zero tasks — demonstrates the empty-project edge case.

        db.commit()

        print("Seed complete.")
        print(f"Demo password for all users: {DEMO_PASSWORD}")
        print("PM logins:      alice@demo.com, bob@demo.com")
        print("Member logins:  carol@demo.com, david@demo.com, priya@demo.com")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
