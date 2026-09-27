import { Switch as Base } from "@base-ui/react/switch";

export function Switch(props: Base.Root.Props) {
  return (
    <Base.Root {...props} className="flex h-[18px] w-[30px] shrink-0 rounded-full bg-stone-300 p-0.5 transition-colors duration-200 ease-out-quint data-[checked]:bg-accent-600">
      <Base.Thumb className="size-3.5 rounded-full bg-white shadow-control transition-transform duration-200 ease-out-quint data-[checked]:translate-x-3" />
    </Base.Root>
  );
}
