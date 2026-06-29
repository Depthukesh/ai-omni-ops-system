"use client";

import type { MaterialOption, ProductOption, SelectOption, StringChangeHandler } from "./shared-types";

export interface RewriteCreateBasicFieldsProps {
  noProductOption: string;
  materials: MaterialOption[];
  products: ProductOption[];
  materialValue: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  onMaterialChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
}

export function RewriteCreateBasicFields(props: RewriteCreateBasicFieldsProps) {
  return (
    <>
      <label className="field-full">
        <span>素材库</span>
        <select value={props.materialValue} onChange={(event) => props.onMaterialChange(event.target.value)}>
          {props.materials.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label || item.title}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>产品</span>
        <select value={props.productValue} onChange={(event) => props.onProductChange(event.target.value)}>
          {props.products.map((item) => (
            <option key={item.id} value={item.id}>
              {item.productName}
            </option>
          ))}
          <option value={props.noProductOption}>不植入产品</option>
        </select>
      </label>
      <label>
        <span>账号角色</span>
        <select value={props.accountRoleValue} onChange={(event) => props.onAccountRoleChange(event.target.value)}>
          {props.accountRoleOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
