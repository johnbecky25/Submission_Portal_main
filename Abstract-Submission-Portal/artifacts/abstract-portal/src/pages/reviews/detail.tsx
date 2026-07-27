import React, { useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  useGetReview, 
  getGetReviewQueryKey,
  useUpdateReview,
  useGetAbstract,
  getGetAbstractQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send } from "lucide-react";

const reviewSchema = z.object({
  score: z.number().min(1).max(10).optional().nullable(),
  comments: z.string().optional().nullable(),
  recommendation: z.enum(["accept", "accept_minor_review", "accept_major_review", "reject", "revise"]).optional().nullable(),
});

export default function ReviewDetail() {
  const { id } = useParams();
  const reviewId = parseInt(id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: review, isLoading: reviewLoading } = useGetReview(reviewId, {
    query: {
      enabled: !!reviewId,
      queryKey: getGetReviewQueryKey(reviewId)
    }
  });

  const { data: abstract, isLoading: abstractLoading } = useGetAbstract(review?.abstractId || 0, {
    query: {
      enabled: !!review?.abstractId,
      queryKey: getGetAbstractQueryKey(review?.abstractId || 0)
    }
  });

  const updateMutation = useUpdateReview();

  const form = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema),
    values: {
      score: review?.score || undefined,
      comments: review?.comments || "",
      recommendation: review?.recommendation || undefined,
    }
  });

  if (reviewLoading || abstractLoading || !review) {
    return <div className="p-8 max-w-5xl mx-auto"><Skeleton className="h-96 w-full" /></div>;
  }

  // Allow re-editing a completed review when the abstract has been resubmitted
  const abstractIsActive = abstract?.status === 'submitted' || abstract?.status === 'under_review';
  const isCompleted = review.status === 'completed' && !abstractIsActive;

  const onSaveDraft = (data: z.infer<typeof reviewSchema>) => {
    updateMutation.mutate(
      { id: reviewId, data: { ...data, status: "pending" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetReviewQueryKey(reviewId) });
          toast({ title: "Draft saved successfully" });
        }
      }
    );
  };

  const onSubmitFinal = (data: z.infer<typeof reviewSchema>) => {
    if (!data.score || !data.comments || !data.recommendation) {
      toast({ title: "Incomplete review", description: "Score, comments, and recommendation are required to submit.", variant: "destructive" });
      return;
    }

    updateMutation.mutate(
      { id: reviewId, data: { ...data, status: "completed" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetReviewQueryKey(reviewId) });
          toast({ title: "Review submitted successfully" });
          setLocation("/reviews");
        }
      }
    );
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-5">
      <Link href="/reviews" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Review Queue
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Abstract Content */}
        <div className="space-y-6">
          <Card className="border-border">
            <CardHeader className="bg-muted/10 pb-4 border-b">
              <CardTitle className="font-serif leading-tight">{abstract?.title}</CardTitle>
              <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                <span>Track: {abstract?.track}</span>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose dark:prose-invert max-w-none prose-sm">
                {abstract?.content?.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Form */}
        <div>
          <Form {...form}>
            <form className="space-y-6 sticky top-8">
              <Card className="border-border shadow-sm">
                <CardHeader>
                  <CardTitle>Evaluation Form</CardTitle>
                  <CardDescription>
                    {isCompleted ? "This review has been completed." : "Provide your feedback and final recommendation."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="score"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between items-center mb-2">
                          <FormLabel className="text-base">Overall Score: {field.value || 0}</FormLabel>
                        </div>
                        <FormControl>
                          <Slider
                            disabled={isCompleted}
                            min={1}
                            max={10}
                            step={1}
                            value={[field.value || 1]}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="py-4"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recommendation"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-base">Recommendation</FormLabel>
                        <FormControl>
                          <RadioGroup
                            disabled={isCompleted}
                            onValueChange={field.onChange}
                            defaultValue={field.value || undefined}
                            className="flex flex-col space-y-1"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="accept" />
                              </FormControl>
                              <FormLabel className="font-normal text-green-700 dark:text-green-500">Accept</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="accept_minor_review" />
                              </FormControl>
                              <FormLabel className="font-normal text-emerald-700 dark:text-emerald-500">Accept – Minor Review</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="accept_major_review" />
                              </FormControl>
                              <FormLabel className="font-normal text-teal-700 dark:text-teal-500">Accept – Major Review</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="on_hold" />
                              </FormControl>
                              <FormLabel className="font-normal text-orange-600 dark:text-orange-400">On Hold</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="revise" />
                              </FormControl>
                              <FormLabel className="font-normal text-amber-700 dark:text-amber-500">Revise & Resubmit</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="reject" />
                              </FormControl>
                              <FormLabel className="font-normal text-red-700 dark:text-red-500">Reject</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="comments"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-base">Detailed Comments</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Provide constructive feedback for the author..." 
                            className="min-h-[200px]"
                            disabled={isCompleted}
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                
                {!isCompleted && (
                  <CardFooter className="flex justify-between bg-muted/10 border-t p-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={form.handleSubmit(onSaveDraft)}
                      disabled={updateMutation.isPending}
                    >
                      <Save className="h-4 w-4 mr-2" /> Save Draft
                    </Button>
                    <Button 
                      type="button"
                      onClick={form.handleSubmit(onSubmitFinal)}
                      disabled={updateMutation.isPending}
                    >
                      <Send className="h-4 w-4 mr-2" /> Submit Review
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
