variable "vpc_id" {
  type        = string
  description = "ID of our VPC"
}


variable "alb_sg_name" {
  type        = string
  description = "Security Group name ALB"
}

variable "ecs_sg_name" {
  type        = string
  description = "Security Group name for ECS"
}

variable "https_cidr" {
  type        = string
  description = "Inbound CIDR range accepted by the ALB"
  default     = "0.0.0.0/0"
}

variable "egress_cidr" {
  type        = string
  description = "Outbound CIDR range from ALB to ECS"
  default     = "0.0.0.0/0"
}
