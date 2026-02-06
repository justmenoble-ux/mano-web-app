import { Layout } from "@/components/Layout";
import { useHousehold } from "@/hooks/use-household";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Home, Users } from "lucide-react";
import { useEffect } from "react";

const householdSchema = z.object({
  name: z.string().min(1, "Household name is required"),
  member1Name: z.string().min(1, "First member name is required"),
  member2Name: z.string().optional(),
});

type HouseholdFormData = z.infer<typeof householdSchema>;

export default function Settings() {
  const { data: household, isLoading } = useHousehold();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<HouseholdFormData>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      name: "",
      member1Name: "",
      member2Name: "",
    },
  });

  useEffect(() => {
    if (household) {
      form.reset({
        name: household.name,
        member1Name: household.member1Name,
        member2Name: household.member2Name || "",
      });
    }
  }, [household, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: HouseholdFormData) => {
      return apiRequest("PATCH", "/api/household", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/household"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save settings", variant: "destructive" });
    },
  });

  const onSubmit = (data: HouseholdFormData) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const hasTwoMembers = !!household?.member2Name;

  return (
    <Layout>
      <div className="space-y-8 max-w-2xl">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-display font-bold text-white" data-testid="text-settings-title">Settings</h1>
          <p className="text-muted-foreground">Manage your household configuration</p>
        </div>

        <Card className="glass-card border-white/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Home className="w-5 h-5" />
              Household Details
            </CardTitle>
            <CardDescription>
              Update your household name and member names
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Household Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., The Smith Residence"
                          className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                          data-testid="input-household-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Household Members</span>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="member1Name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-white">Member 1</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="First member's name"
                            className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                            data-testid="input-member1-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {hasTwoMembers && (
                    <FormField
                      control={form.control}
                      name="member2Name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Member 2</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Second member's name"
                              className="bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
                              data-testid="input-member2-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={updateMutation.isPending}
                  className="w-full"
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
