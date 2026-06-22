import LoginForm from "./LoginForm";

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm space-y-6 border rounded-lg bg-white p-8">
        <h1 className="text-xl font-bold text-gray-900 text-center">
          fz-mart Admin
        </h1>
        <LoginForm />
      </div>
    </div>
  );
}
