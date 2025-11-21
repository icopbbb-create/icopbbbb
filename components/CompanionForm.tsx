// components/CompanionForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subjects } from "@/constants";
import { Textarea } from "@/components/ui/textarea";
import { createCompanion } from "@/lib/server/companion.actions";
import { useRouter } from "next/navigation";
import { useState } from "react";

const formSchema = z.object({
  name: z.string().min(1, { message: "Companion is required." }),
  subject: z.string().min(1, { message: "Subject is required." }),
  topic: z.string().min(1, { message: "Topic is required." }),
  voice: z.string().min(1, { message: "Voice is required." }),
  style: z.string().min(1, { message: "Style is required." }),
  duration: z.coerce.number().min(1, { message: "Duration is required." }),
});

const CompanionForm = () => {
  const router = useRouter();
  const [checking, setChecking] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      subject: "",
      topic: "",
      voice: "",
      style: "",
      duration: 15,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setChecking(true);
    try {
      const companion = await createCompanion(values);
      if (companion && companion.id) {
        router.push(`/companions/${companion.id}`);
        return;
      }
      router.push("/");
    } catch (err: any) {
      console.error("createCompanion failed", err);
      alert("Failed to create companion: " + String(err?.message ?? err));
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <style>{`
        :root { --royal-orange: #ff6b35; --royal-orange-2: #ff8a4a; }
        .form-wrap { display:flex; flex-direction:column; gap:20px; }
        .row-grid { display:grid; grid-template-columns: 1fr 220px; gap:18px; align-items:start; }
        @media(max-width:880px){ .row-grid { grid-template-columns: 1fr; } }

        .field-card { background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.98)); border-radius: 12px; padding: 16px; box-shadow: 0 10px 30px rgba(16,24,40,0.05); border: 1px solid rgba(16,24,40,0.03); }

        .two-col { display:grid; grid-template-columns:1fr 1fr; gap:14px; align-items:center; }
        @media(max-width:640px){ .two-col { grid-template-columns: 1fr; } }

        .label-royal { color: var(--royal-orange); font-weight:700; }

        .submit-row { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:6px; }
        .tip { color:#475569; font-size:14px; }

        .build-btn {
          background: linear-gradient(90deg, var(--royal-orange), var(--royal-orange-2));
          color: white;
          border-radius: 12px;
          padding: 12px 20px;
          box-shadow: 0 12px 38px rgba(255,110,60,0.12);
          transition: transform .16s ease, box-shadow .16s ease;
        }
        .build-btn:hover { transform: translateY(-3px); box-shadow: 0 24px 64px rgba(255,110,60,0.18); }

        /* larger selects & inputs for airy feel */
        .input, .select-trigger, textarea {
          padding: 14px 12px;
          border-radius: 10px;
          font-size: 15px;
        }

        .accent-pill {
          display:inline-block;
          padding:8px 10px;
          border-radius:999px;
          background: linear-gradient(90deg, rgba(255,107,53,0.12), rgba(255,138,74,0.08));
          color: var(--royal-orange);
          font-weight:700;
        }
      `}</style>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="form-wrap">
          <div className="field-card">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="label-royal">Companion name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter the companion name" {...field} className="input" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="row-grid mt-4">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label-royal">Subject</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger className="input select-trigger">
                          <SelectValue placeholder="Select The Subject" />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((subject) => (
                            <SelectItem value={subject} key={subject} className="capitalize">
                              {subject}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label-royal">Estimated duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="15" {...field} className="input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4">
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label-royal">What should the companion help with?</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex. Derivates & Integrals, mock interview prep, or meditation guide" {...field} className="input" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="field-card">
            <div className="two-col">
              <FormField
                control={form.control}
                name="voice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label-royal">Voice</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger className="input select-trigger">
                          <SelectValue placeholder="Select the voice" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="style"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="label-royal">Style</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <SelectTrigger className="input select-trigger">
                          <SelectValue placeholder="Select the style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="formal">Formal</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="tip"><span className="accent-pill">Tip</span> Use a short topic to make the companion focused.</div>

            <div style={{ minWidth: 220 }}>
              <Button type="submit" className="build-btn w-full" disabled={checking}>
                {checking ? "Building…" : "Build Your Companion"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default CompanionForm;
