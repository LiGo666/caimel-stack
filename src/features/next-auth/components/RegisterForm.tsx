"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { registerUser } from "../actions/registerUser";
import { passwordMinChars } from "../config/credentials";

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations("features.next-auth.components");
  const genericT = useTranslations("generic");

  const registrationFormSchema = z
    .object({
      name: z
        .string()
        .min(1, t ? t("validation.errors.nameRequired") : "Name is required"),
      email: z.email(t("validation.errors.emailInvalid")),
      password: z
        .string()
        .min(
          passwordMinChars,
          t("validation.errors.passwordMin", { min: passwordMinChars })
        ),
      confirmPassword: z
        .string()
        .min(1, t("validation.errors.confirmPasswordRequired")),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("validation.errors.passwordsNotMatch"),
      path: ["confirmPassword"],
    });

  const form = useForm({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: { email: "", name: "", password: "", confirmPassword: "" },
    mode: "onBlur",
  });

  const [isLoading, setIsLoading] = React.useState(false);
  const isValid = form.formState.isValid;

  const finish = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const sendData = React.useCallback(
    async (payload) => {
      try {
        const result = await registerUser(payload);
        if (result?.success) {
          toastify(result);
          router.push("/admin");
        } else {
          toastify(result);
        }
      } catch (err) {
        console.error("Registration error:", err);
        toastify(unexpectedErrorToastContent(genericT, "ERROR-643555"));
      } finally {
        finish();
      }
    },
    [router, finish, genericT]
  );

  const onSubmit = (data) => {
    if (isLoading) return;
    setIsLoading(true);
    void sendData({
      email: data.email,
      name: data.name,
      password: data.password,
    });
  };

  return (
    <div className="mx-auto w-full max-w-sm p-4">
      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle>{t("register")}</CardTitle>
          <CardDescription>{t("register-description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="space-y-4"
              dir="auto"
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("components.RegisterForm.form.email.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="email"
                        placeholder={t(
                          "components.RegisterForm.form.email.placeholder"
                        )}
                        type="email"
                        {...field}
                        onBlur={() => form.trigger("email")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("components.RegisterForm.form.name.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="name"
                        placeholder={t(
                          "components.RegisterForm.form.name.placeholder"
                        )}
                        {...field}
                        onBlur={() => form.trigger("name")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("components.RegisterForm.form.password.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="new-password"
                        placeholder={t(
                          "components.RegisterForm.form.password.placeholder"
                        )}
                        type="password"
                        {...field}
                        onBlur={() => form.trigger("password")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("components.RegisterForm.form.confirmPassword.label")}
                    </FormLabel>
                    <FormControl>
                      <Input
                        autoComplete="new-password"
                        placeholder={t(
                          "components.RegisterForm.form.password.placeholder"
                        )}
                        type="password"
                        {...field}
                        onBlur={() => form.trigger("confirmPassword")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                className="w-full"
                disabled={!isValid || isLoading}
                type="submit"
              >
                {isLoading
                  ? t("components.RegisterForm.loading")
                  : t("components.RegisterForm.submit")}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter>
          <p className="text-muted-foreground text-xs">
            <Link className="text-blue-500 hover:underline" href="/auth/signin">
              {t("sign-in-here")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
