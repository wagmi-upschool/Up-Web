import LottieSpinner from "@/components/global/loader/lottie-spinner";

type Props = {};

function Loading({}: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-icon-slate-white">
      <LottieSpinner size={220} />
    </div>
  );
}

export default Loading;
