import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

const LoadingJobPage = () => {
  return (
    <div className="container mx-auto py-8">
      <div className="grid lg:grid-cols-[1fr,400px] gap-8">
        <div className="space-y-8">
          <div className="flex items-start justify-between">
            <div>
              <Skeleton className="h-9 w-[300px] mb-2" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-[150px]" />
                <Skeleton className="h-5 w-[120px]" />
              </div>
            </div>
          </div>
          <section className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </section>
        </div>
        <div className="space-y-6">
          <Card className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-[100px] mb-2" />
              <Skeleton className="h-10 w-full" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoadingJobPage;
