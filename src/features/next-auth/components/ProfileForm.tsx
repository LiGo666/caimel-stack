"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@/features/shadcn/index.client";
import {
  toastify,
  unexpectedErrorToastContent,
} from "@/features/toast/index.client";
import { updateCurrentUserProfile } from "../actions/manageUser";

export function ProfileForm({ userData }: { userData: any }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations("features.next-auth");
  const tProfile = useTranslations("features.next-auth.components.ProfileForm");
  const tGeneric = useTranslations("generic");

  const formSchema = z.object({
    name: z.string().min(1, t("validation.errors.nameRequired")),
    email: z.email(t("validation.errors.emailInvalid")),
  });

  // Initialize the form with user data
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: userData?.name || "", email: userData?.email || "" },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await updateCurrentUserProfile(values);

      if (result.success) {
        toastify(result);
        window.location.reload(); // Refresh the page to show updated data
      } else {
        toastify(result);
      }
    } catch (error) {
      toastify(unexpectedErrorToastContent(tGeneric, "ERROR-342537"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form className="w-full space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tProfile("profile.name")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={tProfile("profile.namePlaceholder")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{tProfile("profile.email")}</FormLabel>
                <FormControl>
                  <Input placeholder="email@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button className="w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              {tProfile("profile.saving")}
              <span className="animate-spin">⏳</span>
            </span>
          ) : (
            tProfile("profile.saveChanges")
          )}
        </Button>
      </form>
    </Form>
  );
}
