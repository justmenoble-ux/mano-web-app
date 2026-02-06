import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Home, Users, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Setup() {
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const [step, setStep] = useState(1);
  const [householdName, setHouseholdName] = useState("");
  const [memberCount, setMemberCount] = useState<"1" | "2">("2");
  const [member1Name, setMember1Name] = useState("");
  const [member2Name, setMember2Name] = useState("");

  const createHousehold = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/household", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: householdName,
          member1Name,
          member2Name: memberCount === "2" ? member2Name : null,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to create household");
      }
      return response.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/household"] });
      window.location.href = "/";
    },
    onError: (error) => {
      console.error("Household creation error:", error);
    },
  });

  const handleComplete = () => {
    createHousehold.mutate();
  };

  const handleNext = () => {
    if (step === 1 && householdName.trim()) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3 && canProceed()) {
      handleComplete();
    }
  };

  const canProceed = () => {
    if (step === 1) return householdName.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return member1Name.trim().length > 0 && (memberCount === "1" || member2Name.trim().length > 0);
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1f2e] via-[#1e293b] to-[#0f172a] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-white/10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mb-4">
              <Home className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">
              Welcome to MaNo Spendometer
            </CardTitle>
            <CardDescription className="text-white/60">
              Let's set up your household
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-white/20"
                  }`}
                />
              ))}
            </div>

            {step === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="household-name" className="text-white/80">
                    What would you like to name your household?
                  </Label>
                  <Input
                    id="household-name"
                    placeholder="e.g., The Smith Family, Our Home"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    data-testid="input-household-name"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <Label className="text-white/80">
                  How many individuals in this household?
                </Label>
                <RadioGroup
                  value={memberCount}
                  onValueChange={(v) => setMemberCount(v as "1" | "2")}
                  className="flex gap-4"
                >
                  <div className="flex-1">
                    <RadioGroupItem value="1" id="one" className="peer sr-only" />
                    <Label
                      htmlFor="one"
                      className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-white/10 bg-white/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 transition-colors"
                    >
                      <User className="w-8 h-8 mb-2 text-white/70" />
                      <span className="text-white font-medium">Just Me</span>
                    </Label>
                  </div>
                  <div className="flex-1">
                    <RadioGroupItem value="2" id="two" className="peer sr-only" />
                    <Label
                      htmlFor="two"
                      className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-white/10 bg-white/5 cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/10 transition-colors"
                    >
                      <Users className="w-8 h-8 mb-2 text-white/70" />
                      <span className="text-white font-medium">Two People</span>
                    </Label>
                  </div>
                </RadioGroup>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="member1" className="text-white/80">
                    {memberCount === "1" ? "Your name" : "First person's name"}
                  </Label>
                  <Input
                    id="member1"
                    placeholder="Enter name"
                    value={member1Name}
                    onChange={(e) => setMember1Name(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                    data-testid="input-member1-name"
                  />
                </div>
                {memberCount === "2" && (
                  <div className="space-y-2">
                    <Label htmlFor="member2" className="text-white/80">
                      Second person's name
                    </Label>
                    <Input
                      id="member2"
                      placeholder="Enter name"
                      value={member2Name}
                      onChange={(e) => setMember2Name(e.target.value)}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                      data-testid="input-member2-name"
                    />
                  </div>
                )}
              </motion.div>
            )}

            <div className="flex gap-3 pt-4">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                  data-testid="button-back"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                disabled={!canProceed() || createHousehold.isPending}
                className="flex-1"
                data-testid="button-next"
              >
                {createHousehold.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : step === 3 ? (
                  "Complete Setup"
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
