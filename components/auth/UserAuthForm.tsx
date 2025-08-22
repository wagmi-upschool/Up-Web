"use client";

import * as React from "react"
import { cn } from "@/lib/utils"
import toast from "react-hot-toast"
import { signIn } from "aws-amplify/auth"
import { useAuth } from "@/components/global/auth-provider"

interface UserAuthFormProps extends React.HTMLAttributes<HTMLDivElement> { }

export function UserAuthForm({ className, ...props }: UserAuthFormProps) {
    const [isLoading, setIsLoading] = React.useState<boolean>(false)
    const [formValue, setFormValue] = React.useState<{password:string,email:string,isTermsChecked:boolean}>({password:"",email:"",isTermsChecked:false});
    const { refreshAuth } = useAuth();

    async function onSubmit(event: React.SyntheticEvent) {
        event.preventDefault()
        
        if (formValue.isTermsChecked === false) {
            toast.error("You need to accept the user Terms & Conditions.");
            return;
        } 
        
        if (formValue.email === null || formValue.email === undefined || formValue.password === undefined 
            || formValue.password === null || formValue.password.length === 0 || formValue.email.length === 0){
                toast.error("You must enter your email and password.");
                return;
            }
            
        setIsLoading(true);

        try {
            const { isSignedIn, nextStep } = await signIn({
                username: formValue.email,
                password: formValue.password,
            });

            if (isSignedIn) {
                toast.success("Login successful!");
                refreshAuth(); // Refresh auth state
            } else if (nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
                toast.error("New password required");
                // Handle new password required
            } else {
                toast.error("Please check your credentials");
            }
        } catch (error: any) {
            console.error('Error signing in:', error);
            toast.error(error.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    }

    function onTermsChange(checked: boolean) {
        setFormValue({...formValue, isTermsChecked: checked});
    }

    function onChangeEvent(event: React.BaseSyntheticEvent, target: "email" | "password") {
        let value = {...formValue};
        value[target] = event.target.value;
        setFormValue({...value});
    }

    return (
        <div className={cn("grid gap-6", className)} {...props}>
            <form onSubmit={onSubmit}>
                <div className="grid gap-2">
                    <div className="grid gap-1">
                        <label className="sr-only" htmlFor="email">
                            Email
                        </label>
                        <input
                            onChange={(event) => onChangeEvent(event, "email")}
                            id="email"
                            placeholder="name@example.com"
                            value={formValue.email}
                            type="email"
                            autoCapitalize="none"
                            autoComplete="email"
                            autoCorrect="off"
                            disabled={isLoading}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <div className="grid gap-1">
                        <label className="sr-only" htmlFor="password">
                            Password
                        </label>
                        <input
                            onChange={(event) => onChangeEvent(event, "password")}
                            id="password"
                            value={formValue.password}
                            placeholder="*******"
                            type="password"
                            autoCapitalize="none"
                            autoComplete="password"
                            autoCorrect="off"
                            disabled={isLoading}
                            className="flex h-10 w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                    <button 
                        disabled={isLoading}
                        type="submit"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gray-900 text-white hover:bg-gray-800 h-10 px-4 py-2"
                    >
                        {isLoading && (
                            <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        )}
                        Log In with Email
                    </button>
                </div>
                <div className="flex items-center mt-4">
                    <input 
                        id="terms" 
                        type="checkbox" 
                        checked={formValue.isTermsChecked} 
                        onChange={(e) => onTermsChange(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-gray-600 focus:ring-gray-500"
                    />
                    <label htmlFor="terms" className="ml-2 text-start text-sm text-gray-600">
                        By clicking continue, you agree to our{" "}
                        <button type="button" className="underline underline-offset-4 hover:text-gray-900">
                            Terms of Service
                        </button>
                        .
                    </label>
                </div>
            </form>
        </div>
    )
}