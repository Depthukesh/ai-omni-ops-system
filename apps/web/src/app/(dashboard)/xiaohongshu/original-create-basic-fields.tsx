"use client";

import type { ProductOption, SelectOption, StringChangeHandler } from "./shared-types";

export interface OriginalCreateBasicFieldsProps {
  calendarOptions: SelectOption[];
  customTopicOption: string;
  noProductOption: string;
  products: ProductOption[];
  calendarValue: string;
  customTopic: string;
  productValue: string;
  accountRoleValue: string;
  accountRoleOptions: SelectOption[];
  onCalendarChange: StringChangeHandler;
  onCustomTopicChange: StringChangeHandler;
  onProductChange: StringChangeHandler;
  onAccountRoleChange: StringChangeHandler;
}

export function OriginalCreateBasicFields(props: OriginalCreateBasicFieldsProps) {
  return (
    <>
      <label>
        <span>营销日历</span>
        <select value={props.calendarValue} onChange={(event) => props.onCalendarChange(event.target.value)}>
          {props.calendarOptions.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
          <option value={props.customTopicOption}>自己有选题，不使用系统选题</option>
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
      {props.calendarValue === props.customTopicOption ? (
        <label className="field-full">
          <span>自定义选题</span>
          <input
            value={props.customTopic}
            onChange={(event) => props.onCustomTopicChange(event.target.value)}
            placeholder="请输入你的原创笔记选题"
          />
        </label>
      ) : null}
    </>
  );
}
