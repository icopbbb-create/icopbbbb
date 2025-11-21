const Dashboard = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">Welcome to Dashboard</h1>
        <p className="text-xl text-muted-foreground">
          You've successfully entered the Edu Voice Agent application
        </p>
        <div className="mt-8 p-6 bg-card rounded-lg border border-border max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            This is a placeholder dashboard page. Build your amazing features here!
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
