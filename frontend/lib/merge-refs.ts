import * as React from "react";
export function mergeRefs<T>(...refs: Array<React.Ref<T> | undefined | null | ((instance: T | null) => void) | React.MutableRefObject<T | null>>) {
  return (value: T | null) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") ref(value);
      else if (ref != null) (ref as React.MutableRefObject<T | null>).current = value;
    });
  };
}
