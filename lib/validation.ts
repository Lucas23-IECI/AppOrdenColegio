import {z} from 'zod';
export const count=z.number().int().min(0).max(1000000).nullable();
const inspection=z.object({notes:z.string().max(20000),checks:z.record(z.enum(['pending','ok','issue','na'])),confirmedAt:z.string().nullable(),confirmedBy:z.string().nullable()});
export const roomSchema=z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),type:z.string().min(1).max(60),site:z.string().min(1).max(100),sector:z.string().max(100),responsible:z.string().max(100),archived:z.boolean(),items:z.array(z.object({id:z.string().uuid(),name:z.string().trim().min(1).max(100),reception:count,return:count})).max(150),reception:inspection,return:inspection,revision:z.number().int().min(0),updatedAt:z.string(),updatedBy:z.string(),mutationId:z.string().uuid()});
